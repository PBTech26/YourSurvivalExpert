import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

export default function Terms() {
  useSeo({
    title: 'Terms of Service | yoursurvivalexpert.ai',
    description:
      'Terms of service for yoursurvivalexpert.ai, outlining usage guidelines for the AI survival guide and checklist.',
  })

  return (
    <SiteLayout>
      <main className="page-shell">
        <section className="page-content legal" data-animate>
          <h1 className="text-gradient">Terms of service</h1>
          <p>
            By using this site, you agree to the following terms. This service provides informational
            guidance and is not a substitute for professional or emergency services.
          </p>
          <div className="content-card" data-animate>
            <h2>Use of the service</h2>
            <p>
              The AI guide is informational and intended to support general preparedness planning.
              Always follow local laws, official guidance, and emergency alerts.
            </p>
          </div>
          <div className="content-card" data-animate>
            <h2>Accuracy and responsibility</h2>
            <p>
              We aim for clear and practical guidance but cannot guarantee outcomes. You are
              responsible for decisions and actions based on the guide.
            </p>
          </div>
          <div className="content-card" data-animate>
            <h2>Contact</h2>
            <p>
              Questions about these terms? Email us at{' '}
              <a href="mailto:techteam@patriotbrandspr.com">techteam@patriotbrandspr.com</a>.
            </p>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
