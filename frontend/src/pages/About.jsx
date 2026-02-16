import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

export default function About() {
  useSeo({
    title: 'About | yoursurvivalexpert.ai',
    description:
      'Learn how yoursurvivalexpert.ai helps people build calm, practical emergency plans with personalized survival guides and checklists.',
  })

  return (
    <SiteLayout>
      <main className="page-shell">
        <section className="page-content" data-animate>
          <h1>About yoursurvivalexpert.ai</h1>
          <p>
            We help people prepare for disruptions without panic. The app combines calm guidance and
            a conversational AI expert to translate your situation into a personalized survival guide
            and emergency checklist.
          </p>
          <div className="content-card" data-animate>
            <h2>Our mission</h2>
            <p>
              Make preparedness approachable, practical, and local. We focus on the essentials so you
              can build confidence quickly and act on the most important steps.
            </p>
          </div>
          <div className="content-card" data-animate>
            <h2>How it works</h2>
            <ul>
              <li>You share a few details about your household and concern.</li>
              <li>The AI expert asks short follow-ups and summarizes your needs.</li>
              <li>You receive a tailored PDF guide and checklist by email.</li>
            </ul>
          </div>
          <div className="cta-panel" data-animate>
            <h3>Ready for your personalized guide?</h3>
            <p>Start a quick conversation and get a practical plan tailored to you.</p>
            <a className="primary" href="/">
              Start the conversation
            </a>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
