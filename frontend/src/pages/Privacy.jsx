import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

export default function Privacy() {
  useSeo({
    title: 'Privacy Policy | yoursurvivalexpert.ai',
    description:
      'Read the privacy policy for yoursurvivalexpert.ai, including how we handle chat data and email delivery for survival guides.',
  })

  return (
    <SiteLayout>
      <main className="page-shell">
        <section className="page-content legal" data-animate>
          <h1>Privacy policy</h1>
          <p>
            We respect your privacy and keep data collection minimal. This policy explains what we
            collect and how it is used.
          </p>
          <div className="content-card" data-animate>
            <h2>Information we collect</h2>
            <ul>
              <li>Conversation details you share with the AI expert.</li>
              <li>Your email address to deliver the PDF survival guide.</li>
              <li>Basic analytics for site performance and quality.</li>
            </ul>
          </div>
          <div className="content-card" data-animate>
            <h2>How we use it</h2>
            <ul>
              <li>Create your personalized survival guide and checklist.</li>
              <li>Send the guide to your inbox.</li>
              <li>Improve clarity, relevance, and user experience.</li>
            </ul>
          </div>
          <div className="content-card" data-animate>
            <h2>Data retention</h2>
            <p>
              We keep data only as long as needed to deliver your guide and maintain service quality.
              We do not sell your personal information.
            </p>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
