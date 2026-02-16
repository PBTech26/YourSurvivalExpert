import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

export default function Contact() {
  useSeo({
    title: 'Contact | yoursurvivalexpert.ai',
    description:
      'Contact yoursurvivalexpert.ai for support, partnerships, or questions about personalized survival guides and emergency checklists.',
  })

  return (
    <SiteLayout>
      <main className="page-shell">
        <section className="page-content" data-animate>
          <h1>Contact us</h1>
          <p>
            Have a question about the survival guide, a partnership idea, or a support request? We
            respond quickly and keep things simple.
          </p>
          <div className="contact-grid" data-animate>
            <div className="contact-card" data-animate>
              <h2>General inquiries</h2>
              <p>Email us with details about your request.</p>
              <a href="mailto:hello@yoursurvivalexpert.ai">hello@yoursurvivalexpert.ai</a>
            </div>
            <div className="contact-card" data-animate>
              <h2>Partnerships</h2>
              <p>We collaborate with preparedness educators and local leaders.</p>
              <a href="mailto:partners@yoursurvivalexpert.ai">partners@yoursurvivalexpert.ai</a>
            </div>
            <div className="contact-card" data-animate>
              <h2>Press</h2>
              <p>For media or editorial requests, reach out here.</p>
              <a href="mailto:press@yoursurvivalexpert.ai">press@yoursurvivalexpert.ai</a>
            </div>
          </div>
          <div className="cta-panel" data-animate>
            <h3>Need a tailored checklist?</h3>
            <p>Start the chat to receive your personalized guide by email.</p>
            <a className="primary" href="/">
              Start the conversation
            </a>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
