import { useEffect, useMemo, useRef, useState } from 'react'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'
import '../App.css'

const starterMessage =
  "Hi, I'm your calm survival expert. Tell me what you're preparing for, and we'll build a practical plan together."

const emptyProfile = {
  preparingFor: '',
  region: '',
  concern: '',
  householdSize: '',
  experience: '',
}

const starterPrompts = [
  'Power outage planning for a small apartment',
  'Hurricane basics for a family of four',
  'Water storage checklist for beginners',
]

const geoRegions = [
  {
    id: 'national',
    label: 'Nationwide (U.S.)',
    name: 'United States',
    city: 'Nationwide',
    state: 'US',
    hazards: ['storms', 'power outages', 'supply gaps'],
  },
  {
    id: 'los-angeles',
    label: 'Los Angeles, CA',
    name: 'Los Angeles',
    city: 'Los Angeles',
    state: 'CA',
    hazards: ['earthquakes', 'wildfires', 'heat waves'],
  },
  {
    id: 'miami',
    label: 'Miami, FL',
    name: 'Miami',
    city: 'Miami',
    state: 'FL',
    hazards: ['hurricanes', 'flooding', 'power loss'],
  },
  {
    id: 'houston',
    label: 'Houston, TX',
    name: 'Houston',
    city: 'Houston',
    state: 'TX',
    hazards: ['storms', 'flooding', 'heat'],
  },
  {
    id: 'chicago',
    label: 'Chicago, IL',
    name: 'Chicago',
    city: 'Chicago',
    state: 'IL',
    hazards: ['winter storms', 'power outages', 'supply delays'],
  },
]

export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState(geoRegions[0])
  const [isChatActive, setIsChatActive] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(emptyProfile)
  const [readyForEmail, setReadyForEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('idle')
  const chatEndRef = useRef(null)

  const profileSummary = useMemo(() => {
    return [
      { label: 'Preparing for', value: profile.preparingFor || 'Not shared yet' },
      { label: 'Region', value: profile.region || 'Not shared yet' },
      { label: 'Primary concern', value: profile.concern || 'Not shared yet' },
      { label: 'Household size', value: profile.householdSize || 'Not shared yet' },
      { label: 'Experience level', value: profile.experience || 'Not shared yet' },
    ]
  }, [profile])

  const completionCount = useMemo(() => {
    return Object.values(profile).filter((value) => String(value).trim()).length
  }, [profile])

  const completionPercent = Math.round((completionCount / 5) * 100)

  const seoTitle = `Survival Guide for ${selectedRegion.name} | yoursurvivalexpert.ai`
  const seoDescription =
    `Get a personalized emergency checklist for ${selectedRegion.name}. ` +
    'Chat with a calm AI survival expert and receive a tailored PDF guide.'

  useSeo({
    title: seoTitle,
    description: seoDescription,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
        description:
          'Calm, practical emergency readiness guidance with personalized survival guides and checklists.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
        description:
          'AI survival expert and emergency checklist generator for households and individuals.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: `yoursurvivalexpert.ai - ${selectedRegion.name}`,
        areaServed: `${selectedRegion.city}, ${selectedRegion.state}`,
        description: `Personalized emergency readiness guidance for ${selectedRegion.name}.`,
        url: 'https://yoursurvivalexpert.ai',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What do I receive after chatting?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `You receive a personalized PDF survival guide and emergency checklist tailored to ${selectedRegion.name} and your household.`,
            },
          },
          {
            '@type': 'Question',
            name: 'Why do you need my email address?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We use your email only to deliver the personalized guide and checklist you requested.',
            },
          },
          {
            '@type': 'Question',
            name: `Is this advice specific to ${selectedRegion.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes. The guide accounts for common risks in ${selectedRegion.name} and the situations you care about most.`,
            },
          },
        ],
      },
    ],
  })

  useEffect(() => {
    // Only scroll within the chat feed, not the entire page
    if (!isChatActive || !chatEndRef.current) return
    const chatFeed = chatEndRef.current.closest('.chat-feed')
    if (!chatFeed) return
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight
    }, 0)
  }, [messages, isLoading, isChatActive])

  const activateChat = () => {
    setIsChatActive(true)
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: starterMessage }])
    }
  }

  const handlePromptClick = (prompt) => {
    if (!isChatActive) {
      activateChat()
    }
    setInput(prompt)
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setError('')
    const outgoing = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, outgoing]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, profile }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to reach the survival expert.')
      }

      setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
      setProfile(data.profile || profile)
      setReadyForEmail(Boolean(data.readyForEmail))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Sorry, I hit a snag. Please try again in a moment.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const submitEmail = async (event) => {
    event.preventDefault()
    if (!email || emailStatus === 'sending') return

    setError('')
    setEmailStatus('sending')
    try {
      const response = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, profile }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to deliver the guide.')
      }

      setEmailStatus('sent')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Your personalized guide is on the way. Check your inbox shortly, and stay safe.',
        },
      ])
    } catch (err) {
      setEmailStatus('idle')
      setError(err.message || 'Email delivery failed. Please try again.')
    }
  }

  return (
    <SiteLayout ctaLabel="Start" onCta={activateChat}>
      <main>
        <section className="hero" data-animate>
          <div className="hero-copy">
            <p className="kicker">Calm guidance when it matters most</p>
            <h1>Chat with an AI survival expert and get a personalized emergency guide.</h1>
            <p className="lede">
              Your Survival Expert helps you plan for outages, storms, and disruptions. Start a
              quick conversation and receive a tailored PDF guide that fits your household and
              region.
            </p>
            <div className="pill-row">
              <span className="pill">Protect your people</span>
              <span className="pill">Equip your essentials</span>
              <span className="pill">Empower your next step</span>
            </div>
            <div className="hero-grid">
              <div className="hero-card">
                <h2>Who this is for</h2>
                <ul>
                  <li>Individuals, couples, and families who want a clear plan.</li>
                  <li>First-time preppers who need a calm, trusted starting point.</li>
                  <li>Busy households looking for realistic, low-stress checklists.</li>
                </ul>
              </div>
              <div className="hero-card">
                <h2>What it helps with</h2>
                <ul>
                  <li>Storms, power outages, water shortages, and supply gaps.</li>
                  <li>Prioritizing essentials without fear-based messaging.</li>
                  <li>Building a step-by-step plan you can act on today.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="hero-aside">
            <div className="highlight">
              <div className="highlight-badge">Preparedness snapshot</div>
              <h3>What you will receive</h3>
              <p>
                A personalized survival checklist with practical steps, supply targets, and tailored
                advice you can reference anytime.
              </p>
              <div className="stat-row">
                <div>
                  <span className="stat">5-7 min</span>
                  <span className="stat-label">chat time</span>
                </div>
                <div>
                  <span className="stat">PDF</span>
                  <span className="stat-label">delivered to email</span>
                </div>
                <div>
                  <span className="stat">0</span>
                  <span className="stat-label">spam promises</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="divider" aria-hidden="true" />

        <section className="chat-section" data-animate>
          <div className="chat-header">
            <div>
              <p className="kicker">Talk with the Survival Expert</p>
              <h2>Start a calm conversation when you are ready.</h2>
              <p className="lede">
                The assistant listens, asks follow-up questions, and builds a clear plan tailored to
                your situation. You stay in control of the pace.
              </p>
              <div className="prompt-row">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="prompt-pill"
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            {!isChatActive && (
              <button className="primary" type="button" onClick={activateChat}>
                Start the conversation
              </button>
            )}
          </div>

          <div className="chat-layout">
            <div className="chat-card">
              <div className="geo-selector">
                <label htmlFor="geo">Your region</label>
                <select
                  id="geo"
                  value={selectedRegion.id}
                  onChange={(event) => {
                    const nextRegion = geoRegions.find((item) => item.id === event.target.value)
                    setSelectedRegion(nextRegion || geoRegions[0])
                  }}
                >
                  {geoRegions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="chat-meta">
                <div className="status">
                  <span className="status-dot" />
                  Survival expert is ready
                </div>
                <span className="status-note">Session stays private</span>
              </div>
              <div className="chat-feed" aria-live="polite">
                {!isChatActive ? (
                  <div className="chat-empty">
                    <p>
                      The AI expert is standing by. Share what you want to prepare for, and we will
                      build a tailored plan together.
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`chat-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                {isLoading && isChatActive && (
                  <div className="chat-bubble assistant">Thinking through your situation...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              {isChatActive && (
                <form className="chat-input" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder="Type your response..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                  />
                  <button className="primary" type="submit" disabled={isLoading}>
                    Send
                  </button>
                </form>
              )}
              {error && <p className="form-error">{error}</p>}

              {readyForEmail && (
                <form className="email-capture" onSubmit={submitEmail}>
                  <div>
                    <label htmlFor="email">Email for your PDF guide</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={emailStatus === 'sent'}
                      required
                    />
                  </div>
                  <button
                    className="primary"
                    type="submit"
                    disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                  >
                    {emailStatus === 'sending' ? 'Sending...' : 'Send my guide'}
                  </button>
                  {emailStatus === 'sent' && (
                    <p className="form-success">Guide sent. Check your inbox in a few minutes.</p>
                  )}
                </form>
              )}
            </div>

            <aside className="profile-card">
              <div className="profile-meta">
                <h3>What the expert has learned</h3>
                <span className="progress-label">{completionPercent}% complete</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${completionPercent}%` }} />
              </div>
              <ul>
                {profileSummary.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
              <p className="profile-note">
                Your details stay in this session until your guide is generated.
              </p>
            </aside>
          </div>
        </section>

        <section className="geo-section" data-animate>
          <div className="geo-content">
            <h2>Local readiness for {selectedRegion.name}</h2>
            <p>
              Your plan adjusts for regional risks and the realities of your neighborhood in{' '}
              {selectedRegion.name}. We focus on practical steps for {selectedRegion.hazards.join(', ')}.
            </p>
            <div className="geo-grid">
              <div className="geo-card">
                <h3>{selectedRegion.name} emergency checklist</h3>
                <p>
                  A concise, locally aware checklist that fits your household and the risks most
                  common in {selectedRegion.city}.
                </p>
              </div>
              <div className="geo-card">
                <h3>Neighborhood-ready planning</h3>
                <p>Short, realistic steps for power, water, and communication plans near you.</p>
              </div>
              <div className="geo-card">
                <h3>Fast-start action list</h3>
                <p>Prioritized actions you can complete in one weekend to build resilience.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="faq-section" data-animate>
          <div className="faq-content">
            <h2>Frequently asked questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h3>What do I receive after chatting?</h3>
                <p>
                  A personalized PDF survival guide and emergency checklist tailored to {selectedRegion.name}
                  and your household.
                </p>
              </div>
              <div className="faq-item">
                <h3>Why do you need my email address?</h3>
                <p>We use your email only to deliver the guide you requested.</p>
              </div>
              <div className="faq-item">
                <h3>Is the guidance local to {selectedRegion.name}?</h3>
                <p>
                  Yes. We tailor the plan to the regional risks common in {selectedRegion.name}.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
