import { CopyButton } from "./CopyButton";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="viewport-container">
      {/* Minimal Header */}
      <header className="header">
        <a href="/" className="brand">
          <span className="brand-dot" />
          <span className="brand-title">Devlabs</span>
        </a>

        <div className="status-tag">
          <span className="status-indicator" />
          <span>EDGE_STATIC // READY</span>
        </div>
      </header>

      {/* Hero & Specifications */}
      <section className="main-content">
        <div className="hero-block">
          <span className="hero-label">SANDBOX v0.2.0</span>
          <h1 className="hero-title">Minimal Prototype Environment</h1>
          <p className="hero-description">
            Clean-slate baseline designed for rapid frontend prototyping and edge experiments.
            Zero background polling, zero serverless function overhead, fully optimized for Vercel Hobby tier.
          </p>
        </div>

        {/* Command Box */}
        <div className="command-box">
          <code className="command-code">
            git clone https://github.com/AspiringWebGaurav/devlabs.git
          </code>
          <CopyButton />
        </div>

        {/* Specs Row */}
        <div className="specs-grid">
          <div className="spec-item">
            <span className="spec-label">Runtime</span>
            <span className="spec-val">Next.js 15 (Edge Static)</span>
          </div>

          <div className="spec-item">
            <span className="spec-label">Polling Overhead</span>
            <span className="spec-val">0ms (Event-Driven)</span>
          </div>

          <div className="spec-item">
            <span className="spec-label">Deployment Plan</span>
            <span className="spec-val">Vercel Hobby Optimized</span>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="footer">
        <div>
          <span>DEVLABS // SANDBOX</span>
        </div>
        <div className="footer-links">
          <a
            href="https://github.com/AspiringWebGaurav/devlabs"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            GitHub
          </a>
          <a
            href="https://vercel.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Vercel Docs
          </a>
        </div>
      </footer>
    </main>
  );
}
