from __future__ import annotations

import base64
import os
import re
import logging
from io import BytesIO
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, EmailStr
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# -------------------------------------------------
# App & Config
# -------------------------------------------------

# Load .env from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)
logging.basicConfig(level=logging.INFO)

APP_NAME = "yoursurvivalexpert.ai"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAROPOST_API_KEY = os.getenv("MAROPOST_API_KEY")
MAROPOST_ACCOUNT_ID = os.getenv("MAROPOST_ACCOUNT_ID")
MAROPOST_TAG_ID = os.getenv("MAROPOST_TAG_ID")
MAROPOST_FROM_EMAIL = os.getenv("MAROPOST_FROM_EMAIL")

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Constants & Prompts
# -------------------------------------------------

PROFILE_TEMPLATE: Dict[str, str] = {
    "preparingFor": "",
    "region": "",
    "concern": "",
    "householdSize": "",
    "experience": "",
}

QUESTION_ORDER = [
    ("preparingFor", "Who are you preparing for — yourself or a household/family?"),
    ("region", "What general region are you in?"),
    ("concern", "What situation are you most concerned about?"),
    ("householdSize", "How many people are in your household?"),
    ("experience", "Would you describe your experience as beginner, intermediate, or advanced?"),
]

CHAT_PROMPT = (
    "You are a calm, knowledgeable survival expert. "
    "Speak clearly and practically. Ask one question at a time. "
    "Avoid fear-based language. "
    "Align guidance with the site context provided. Do not quote or reproduce site text verbatim; paraphrase. "
    "Gather the following information naturally: preparingFor, region, concern, householdSize, experience. "
    "When complete, summarize briefly and ask for an email to send a personalized PDF guide."
)

GUIDE_PROMPT = (
    "You are a calm survival expert. "
    "Write a personalized emergency preparedness guide.\n\n"
    "Structure:\n"
    "- Short overview paragraph\n"
    "- Checklist with bullet points\n"
    "- Practical, low-stress next steps\n\n"
    "Tone: calm, practical, non-alarmist.\n"
    "Align guidance with the site context provided. Do not quote or reproduce site text verbatim; paraphrase."
)

SITE_CONTEXT = (
    "The Ready Network focuses on protecting families, equipping households, and empowering people with practical skills. "
    "It emphasizes preparedness training (e.g., bug-out bag basics, gardening for resilience, and general readiness), "
    "responsible self-protection, and confidence through clear, structured guidance. "
    "The tone is supportive and capability-building, not alarmist."
)

# -------------------------------------------------
# Models
# -------------------------------------------------

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message] = []
    profile: Dict[str, str] = {}


class GuideRequest(BaseModel):
    email: EmailStr
    profile: Dict[str, str] = {}

# -------------------------------------------------
# Helpers
# -------------------------------------------------

def normalize_profile(profile: Optional[Dict[str, str]]) -> Dict[str, str]:
    merged = PROFILE_TEMPLATE.copy()
    if profile:
        merged.update({k: v for k, v in profile.items() if v})
    return merged


def extract_profile_from_message(profile: Dict[str, str], message: Optional[str]) -> Dict[str, str]:
    if not message:
        return profile

    updated = profile.copy()
    lower = message.lower()
    is_question = "?" in message
    greeting_terms = {
        "hi",
        "hello",
        "hey",
        "yo",
        "thanks",
        "thank you",
        "ok",
        "okay",
    }

    if not updated["preparingFor"]:
        if re.search(r"\b(family|kids|children|household|partner|spouse)\b", lower):
            updated["preparingFor"] = "Family or household"
        elif re.search(r"\b(myself|yourself|self|just me|solo|single|only me|for me|me)\b", lower):
            updated["preparingFor"] = "Myself"

    if not updated["experience"]:
        if "beginner" in lower:
            updated["experience"] = "Beginner"
        elif "intermediate" in lower:
            updated["experience"] = "Intermediate"
        elif re.search(r"\b(advanced|advance|expert|experienced)\b", lower):
            updated["experience"] = "Advanced"

    if not updated["concern"]:
        cleaned = re.sub(r"[^a-z\s-]", "", lower).strip()
        has_generic_question = re.search(r"\b(what|which|choices|options)\b", lower)
        if 3 <= len(cleaned) <= 40 and not is_question and not has_generic_question:
            updated["concern"] = message.strip()

    if not updated["householdSize"]:
        size_match = re.search(r"\b(\d{1,2})\b", message)
        if size_match:
            updated["householdSize"] = size_match.group(1)

    if not updated["region"]:
        region_match = re.search(r"\b(?:in|from|near)\s+([A-Za-z\s]{2,40})", message, re.IGNORECASE)
        if region_match:
            updated["region"] = region_match.group(1).strip()

    if not updated["region"]:
        normalized = re.sub(r"[^a-z\s]", "", lower).strip()
        common_regions = {
            "us": "United States",
            "usa": "United States",
            "united states": "United States",
            "united states of america": "United States",
            "uk": "United Kingdom",
            "united kingdom": "United Kingdom",
            "canada": "Canada",
            "australia": "Australia",
        }
        if normalized in common_regions:
            updated["region"] = common_regions[normalized]
        else:
            is_short_region = 3 <= len(normalized) <= 40 and re.fullmatch(r"[a-z\s]+", normalized)
            is_not_other_field = not re.search(
                r"\b(family|kids|children|household|partner|spouse|myself|self|solo|single|only me|beginner|intermediate|advanced)\b",
                lower,
            )
            is_not_greeting = normalized not in greeting_terms
            if is_short_region and is_not_other_field and is_not_greeting:
                updated["region"] = message.strip()

    return updated


def get_missing_fields(profile: Dict[str, str]) -> List[str]:
    return [key for key, _ in QUESTION_ORDER if not profile.get(key)]


def build_chat_reply(profile: Dict[str, str], missing: List[str]) -> str:
    if not missing:
        return (
            "Thanks — I have what I need. "
            "If you'd like, I can generate a personalized preparedness guide and email it to you."
        )
    return dict(QUESTION_ORDER)[missing[0]]


def call_openai(messages: List[Dict[str, str]]) -> Optional[str]:
    if not openai_client:
        return None
    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0.4,
            messages=messages,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logging.warning(f"OpenAI error: {e}")
        return None


def build_guide_text(profile: Dict[str, str]) -> str:
    fallback = (
        "Overview\n"
        f"You are preparing for {profile['preparingFor']} in {profile['region']}.\n\n"
        "Checklist\n"
        "- Secure water and food supplies\n"
        "- Prepare lighting and power backups\n"
        "- Establish a communication plan\n"
        "- Review local alerts\n\n"
        "Next Steps\n"
        "Start with essentials and expand gradually."
    )

    messages = [
        {
            "role": "system",
            "content": f"{GUIDE_PROMPT}\n\nSite context:\n{SITE_CONTEXT}",
        },
        {"role": "user", "content": str(profile)},
    ]

    return call_openai(messages) or fallback

# -------------------------------------------------
# PDF & Email
# -------------------------------------------------

def create_pdf(title: str, body: str, profile: Dict[str, str]) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(inch, height - inch, title)

    pdf.setFont("Helvetica", 11)
    y = height - 1.5 * inch

    for k, v in profile.items():
        pdf.drawString(inch, y, f"{k}: {v}")
        y -= 0.22 * inch

    y -= 0.3 * inch

    for line in body.splitlines():
        if y < inch:
            pdf.showPage()
            pdf.setFont("Helvetica", 11)
            y = height - inch
        pdf.drawString(inch, y, line)
        y -= 0.22 * inch

    pdf.save()
    buffer.seek(0)
    return buffer.read()


def send_email(email: str, pdf_bytes: bytes) -> None:
    if not MAROPOST_API_KEY or not MAROPOST_ACCOUNT_ID:
        logging.warning("Maropost not configured.")
        return

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {MAROPOST_API_KEY}",
    }

    # ---- CREATE CONTACT ----
    contact_payload = {
        "contact": {
            "email": email,
            "first_name": "Survival",
            "last_name": "Guide",
            "tags": [int(MAROPOST_TAG_ID)] if MAROPOST_TAG_ID else [],
        }
    }

    contact_url = f"https://api.maropost.com/accounts/{MAROPOST_ACCOUNT_ID}/contacts"

    contact_res = requests.post(
        contact_url,
        headers=headers,
        json=contact_payload,
        timeout=15,
    )

    logging.info(f"Contact response: {contact_res.status_code} - {contact_res.text}")

    # ---- SEND EMAIL ----
    pdf_base64 = base64.b64encode(pdf_bytes).decode()

    email_payload = {
        "email": {
            "from": {
                "email": MAROPOST_FROM_EMAIL,
                "name": "Your Survival Expert"
            },
            "to": [{"email": email}],
            "subject": "Your Personalized Survival Guide",
            "html_body": "<p>Your personalized survival guide is attached.</p>",
            "attachments": [
                {
                    "file_name": "survival-guide.pdf",
                    "content": pdf_base64
                }
            ],
        }
    }

    email_url = f"https://api.maropost.com/accounts/{MAROPOST_ACCOUNT_ID}/emails"

    email_res = requests.post(
        email_url,
        headers=headers,
        json=email_payload,
        timeout=20,
    )

    logging.info(f"Email response: {email_res.status_code} - {email_res.text}")

    if email_res.status_code >= 400:
        logging.error("Maropost email send failed.")

# -------------------------------------------------
# Routes
# -------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/chat")
def chat(req: ChatRequest):
    profile = normalize_profile(req.profile)
    latest_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    profile = extract_profile_from_message(profile, latest_user.content if latest_user else None)
    missing = get_missing_fields(profile)

    messages = [
        {
            "role": "system",
            "content": (
                f"{CHAT_PROMPT}\n\nSite context:\n{SITE_CONTEXT}\n\n"
                f"Known profile: {profile}\nMissing: {missing}"
            ),
        },
        *[m.dict() for m in req.messages[-10:]],
    ]

    reply = call_openai(messages) or build_chat_reply(profile, missing)

    return {
        "reply": reply,
        "profile": profile,
        "readyForEmail": not missing,
    }


@app.post("/api/guide")
def guide(req: GuideRequest):
    profile = normalize_profile(req.profile)
    text = build_guide_text(profile)
    pdf = create_pdf("Personalized Survival Guide", text, profile)
    send_email(req.email, pdf)
    return {"ok": True}
