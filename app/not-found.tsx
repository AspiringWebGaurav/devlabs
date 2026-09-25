import Link from "next/link";

export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main className="viewport-container">
      <header className="header">
        <Link href="/" className="brand">
          <span className="brand-dot" />
          <span className="brand-title">Devlabs</span>
        </Link>
        <div className="status-tag">
          <span>ERROR 404</span>
        </div>
      </header>

      <section className="main-content">
        <div className="hero-block">
          <span className="hero-label">NOT FOUND</span>
          <h1 className="hero-title">404 &mdash; Page Not Found</h1>
          <p className="hero-description">
            The requested route does not exist in this minimal sandbox environment.
          </p>
        </div>

        <div>
          <Link
            href="/"
            className="command-btn"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            &larr; Return Home
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div>DEVLABS // SANDBOX</div>
      </footer>
    </main>
  );
}
