
export default function Home() {
  return (
    <main>
      <nav className="navbar">
        <a href="/" className="logo">
          <span className="logo-icon">V</span>
          VerAge
        </a>

        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#system">Our System</a>
          <a href="#portal">Portal</a>
        </div>

        <a href="#portal" className="nav-button">
          Get Started →
        </a>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            INTEGRATED ALCOHOL CONTROL SYSTEM
          </span>

          <h1>
            Responsible Sales.
            <br />
            <span>Safer Communities.</span>
          </h1>

          <p>
            VerAge connects merchants, government authorities,
            and communities to promote responsible alcohol sales,
            age verification, and transparent regulatory monitoring.
          </p>

<div className="hero-actions">
  <a href="#portal" className="primary-button">
    Explore VerAge →
  </a>

  <a href="#about" className="secondary-button">
    Learn More
  </a>

  <a href="/report" className="secondary-button">
    Report Illegal Outlet →
  </a>
</div>


          <div className="stats">
            <div>
              <h2>21+</h2>
              <p>Minimum purchasing age</p>
            </div>

            <div>
              <h2>3</h2>
              <p>Connected stakeholders</p>
            </div>

            <div>
              <h2>1</h2>
              <p>Integrated platform</p>
            </div>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-header">
            <span className="logo-icon">V</span>
            <strong>VerAge Monitor</strong>
            <span className="active">● ACTIVE</span>
          </div>

          <div className="shield">
            ✓
          </div>

          <h2>Age Verification</h2>
          <p className="card-description">
            Responsible transaction protection
          </p>

          <div className="monitor">
            <div>
              <span>Identity Verification</span>
              <strong>Protected</strong>
            </div>

            <div>
              <span>Merchant Compliance</span>
              <strong>Monitored</strong>
            </div>

            <div>
              <span>Public Reporting</span>
              <strong>Enabled</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <span className="eyebrow">ABOUT VERAGE</span>

        <h2>
          More than a platform.
          <br />
          <span>A connected ecosystem.</span>
        </h2>

        <p>
          VerAge bridges the gap between alcohol retailers,
          regulatory authorities, and the public through
          technology-driven transparency and accountability.
        </p>
      </section>

      <section className="features" id="system">
        <article className="feature">
          <span className="feature-icon">✓</span>
          <h3>Age Verification</h3>
          <p>
            Help merchants verify purchaser eligibility
            before completing alcohol transactions.
          </p>
        </article>

        <article className="feature">
          <span className="feature-icon">▣</span>
          <h3>License Monitoring</h3>
          <p>
            Enable authorities to validate licenses
            and monitor regulatory compliance.
          </p>
        </article>

        <article className="feature">
          <span className="feature-icon">◎</span>
          <h3>Community Reporting</h3>
          <p>
            Give the public a channel to report suspected
            illegal alcohol sales and distribution.
          </p>
        </article>
      </section>

      <section className="portal" id="portal">
        <span className="eyebrow">ACCESS PORTAL</span>

        <h2>One system. Three stakeholders.</h2>

        <p>Select your role to explore the VerAge system.</p>

        <div className="portal-grid">
          <article className="portal-card">
            <span className="role">01 / MERCHANT</span>
            <h3>Merchant Portal</h3>
            <p>
              Register businesses, submit licenses,
              manage outlets, and verify purchasers.
            </p>
            <a href="/merchant">Merchant Access →</a>
          </article>

          <article className="portal-card">
            <span className="role">02 / GOVERNMENT</span>
            <h3>Government Portal</h3>
            <p>
              Validate licenses, monitor compliance,
              and review merchant activities.
            </p>
            <a href="/government">Government Access →</a>
          </article>

          <article className="portal-card">
            <span className="role">03 / PUBLIC</span>
            <h3>Public Reporting</h3>
            <p>
              Report suspected illegal sales
              without creating an account.
            </p>
            <a href="/report">Submit a Report →</a>
          </article>
        </div>
      </section>

      <section className="closing">
        <h2>
          Together, we create
          <br />
          <span>responsible communities.</span>
        </h2>

        <p>
          Technology, transparency, and collective
          responsibility for a better future.
        </p>

        <a href="#portal" className="primary-button">
          Enter VerAge →
        </a>
      </section>

      <footer className="footer">
        <a href="/" className="logo">
          <span className="logo-icon">V</span>
          VerAge
        </a>

        <p>Integrated Alcohol Control System</p>

        <span>© 2026 VerAge</span>
      </footer>
    </main>
  );
}
