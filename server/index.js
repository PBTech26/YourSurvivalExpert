import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import PDFDocument from 'pdfkit'
import { Resend } from 'resend'
import OpenAI from 'openai'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const profileTemplate = {
  preparingFor: '',
  region: '',
  concern: '',
  householdSize: '',
  experience: '',
}

const concerns = [
  { key: 'hurricane', label: 'Hurricanes' },
  { key: 'storm', label: 'Storms' },
  { key: 'power outage', label: 'Power outages' },
  { key: 'blackout', label: 'Power outages' },
  { key: 'wildfire', label: 'Wildfires' },
  { key: 'flood', label: 'Flooding' },
  { key: 'water', label: 'Water shortage' },
  { key: 'civil', label: 'Civil unrest' },
  { key: 'earthquake', label: 'Earthquakes' },
  { key: 'winter', label: 'Severe winter' },
]

const questionOrder = [
  {
    key: 'preparingFor',
    question: 'Are you preparing for yourself, or for a household or family?',
  },
  {
    key: 'region',
    question: 'What general region are you in (state, province, or country)?',
  },
  {
    key: 'concern',
    question: 'What is the main situation you are preparing for?',
  },
  {
    key: 'householdSize',
    question: 'How many people are in your household?',
  },
  {
    key: 'experience',
    question: 'Would you call your experience level beginner, intermediate, or advanced?',
  },
]

const systemPrompt = `You are a calm, knowledgeable survival expert. Keep responses short and conversational.
Gather these details: preparingFor, region, concern, householdSize, experience.
Ask one question at a time. Avoid fear-based language.
When all details are known, summarize them briefly and ask for the user's email to send a personalized PDF survival guide.`

const guidePrompt = `You are a calm survival expert. Write a personalized emergency guide with:
- A short overview paragraph.
- A checklist section with bullet points.
- Practical, low-stress steps tailored to the profile.
Keep the tone calm, helpful, and authoritative. Do not use fear-based language.`

const normalizeProfile = (profile = {}) => ({
  ...profileTemplate,
  ...profile,
})

const isProfileComplete = (profile) =>
  Object.values(profile).every((value) => Boolean(String(value).trim()))

const extractProfileFromMessage = (profile, message) => {
  if (!message) return profile
  const updated = { ...profile }
  const lower = message.toLowerCase()

  if (!updated.preparingFor) {
    if (/(family|kids|children|household|partner|spouse)/.test(lower)) {
      updated.preparingFor = 'Family or household'
    } else if (/(myself|just me|solo|single|only me)/.test(lower)) {
      updated.preparingFor = 'Myself'
    }
  }

  if (!updated.experience) {
    if (lower.includes('beginner')) updated.experience = 'Beginner'
    if (lower.includes('intermediate')) updated.experience = 'Intermediate'
    if (lower.includes('advanced')) updated.experience = 'Advanced'
  }

  if (!updated.concern) {
    const match = concerns.find((item) => lower.includes(item.key))
    if (match) updated.concern = match.label
  }

  if (!updated.householdSize) {
    const sizeMatch = message.match(/\b(\d{1,2})\b/)
    if (sizeMatch) updated.householdSize = sizeMatch[1]
  }

  if (!updated.region) {
    const regionMatch = message.match(/\b(?:in|from|near)\s+([A-Za-z\s]{2,40})/i)
    if (regionMatch) updated.region = regionMatch[1].trim()
  }

  return updated
}

const getMissingFields = (profile) =>
  questionOrder.filter((item) => !profile[item.key]).map((item) => item.key)

const fallbackReply = (profile, readyForEmail) => {
  if (readyForEmail) {
    return `Thanks. I have what I need: ${profile.preparingFor}, ${profile.region}, focused on ${profile.concern}. Share your email and I will send your personalized PDF guide.`
  }
  const nextQuestion = questionOrder.find((item) => !profile[item.key])
  return nextQuestion
    ? `Thanks for sharing. ${nextQuestion.question}`
    : 'Thanks. Share anything else that would help me tailor your guide.'
}

const fetchAiReply = async ({ messages, profile, missingFields }) => {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const aiMessages = [
    {
      role: 'system',
      content: `${systemPrompt}\nKnown profile: ${JSON.stringify(profile)}\nMissing: ${missingFields.join(', ') || 'none'}`,
    },
    ...messages.slice(-12),
  ]

  const completion = await openai.chat.completions.create({
    model,
    messages: aiMessages,
    temperature: 0.4,
  })

  return completion.choices[0]?.message?.content?.trim()
}

const buildGuideText = async (profile) => {
  if (!openai) {
    return `Overview\nYou are preparing for ${profile.preparingFor} in ${profile.region}. The main concern is ${profile.concern}.\n\nChecklist\n- Confirm water and food supplies for ${profile.householdSize} people.\n- Create a calm communication plan and meeting point.\n- Keep power, lighting, and first-aid supplies accessible.\n- Review local alerts and keep documents stored safely.\n\nNext Steps\nStart with the essentials this week, then expand with comfort items once the basics are covered.`
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      { role: 'system', content: guidePrompt },
      {
        role: 'user',
        content: `Profile:\nPreparing for: ${profile.preparingFor}\nRegion: ${profile.region}\nConcern: ${profile.concern}\nHousehold size: ${profile.householdSize}\nExperience: ${profile.experience}`,
      },
    ],
  })

  return completion.choices[0]?.message?.content?.trim()
}

const createPdfBuffer = (title, content, profile) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).text(title, { align: 'left' })
    doc.moveDown(0.5)
    doc
      .fontSize(12)
      .fillColor('#444444')
      .text(`Prepared for: ${profile.preparingFor}`)
      .text(`Region: ${profile.region}`)
      .text(`Primary concern: ${profile.concern}`)
      .text(`Household size: ${profile.householdSize}`)
      .text(`Experience level: ${profile.experience}`)
    doc.moveDown()

    content.split(/\n+/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        doc.moveDown(0.6)
        return
      }
      if (/^[-*]/.test(trimmed)) {
        doc.text(`• ${trimmed.replace(/^[-*]\s*/, '')}`)
        return
      }
      doc.fontSize(12).fillColor('#1f1c1a').text(trimmed)
    })

    doc.end()
  })
}

const sendGuideEmail = async (email, buffer) => {
  if (!resend) {
    return { skipped: true }
  }

  const from = process.env.RESEND_FROM
  if (!from) {
    throw new Error('RESEND_FROM is not set.')
  }

  await resend.emails.send({
    from,
    to: email,
    subject: 'Your personalized survival guide',
    text: 'Here is your personalized survival guide. Stay safe and prepared.',
    attachments: [
      {
        filename: 'personalized-survival-guide.pdf',
        content: buffer.toString('base64'),
      },
    ],
  })

  return { sent: true }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/chat', async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages) ? req.body.messages : []
    const profile = normalizeProfile(req.body.profile)
    const latestUserMessage = [...messages].reverse().find((msg) => msg.role === 'user')
    const updatedProfile = extractProfileFromMessage(profile, latestUserMessage?.content)
    const missingFields = getMissingFields(updatedProfile)
    const readyForEmail = missingFields.length === 0

    let reply = fallbackReply(updatedProfile, readyForEmail)
    if (openai) {
      const aiReply = await fetchAiReply({ messages, profile: updatedProfile, missingFields })
      if (aiReply) reply = aiReply
    }

    res.json({ reply, profile: updatedProfile, readyForEmail })
  } catch (error) {
    res.status(500).json({ error: 'Unable to respond right now.' })
  }
})

app.post('/api/guide', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim()
    const profile = normalizeProfile(req.body.profile)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }

    const guideText = await buildGuideText(profile)
    const pdfBuffer = await createPdfBuffer('Personalized Survival Guide', guideText, profile)
    await sendGuideEmail(email, pdfBuffer)

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Unable to generate or send the guide.' })
  }
})

const port = process.env.PORT || 5050
app.listen(port, () => {
  console.log(`Survival expert server running on port ${port}`)
})
