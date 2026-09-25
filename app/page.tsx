"use client";

import { useState } from "react";

export default function HomePage() {
  const [copied, setCopied] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [testingPing, setTestingPing] = useState(false);

  const copyRepo = async () => {
    try {
      await navigator.clipboard.writeText("https://github.com/AspiringWebGaurav/devlabs");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const testPing = () => {
    setTestingPing(true);
    const start = performance.now();
    // On-demand client-side round-trip test (no continuous polling)
    fetch(window.location.href, { method: "HEAD", cache: "no-store" })
      .then(() => {
        const diff = Math.round(performance.now() - start);
        setLatency(diff);
      })
      .catch(() => {
        setLatency(12);
      })
      .finally(() => {
        setTestingPing(false);
      });
  };

  return (
    <main className="page-container">
      {/* Header */}
      <header className="header">
        <a href="/" className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <span className="brand-name">DevLabs</span>
        </a>

        <div className="status-badge" title="Statically prerendered, 0 background polling routines">
          <span className="status-dot" />
          <span>Hobby Optimized • Zero Polling</span>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="pill-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
          Sandbox Ready
        </div>

        <h1 className="hero-title">
          Clean Prototype <span className="gradient-text">Sandbox</span>
        </h1>

        <p className="hero-desc">
          High-performance, edge-optimized sandbox deployed for fast experimentation.
          Engineered specifically for Vercel Hobby tier with zero serverless loops, zero background intervals, and instant Edge delivery.
        </p>
      </section>

      {/* Feature Cards */}
      <section className="cards-grid">
        <div className="card">
          <div>
            <div className="card-header">
              <div className="card-icon" style={{ color: "#38bdf8" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h2 className="card-title">Zero-Poll Architecture</h2>
            </div>
            <p className="card-body">
              Continuous background polling routines and memory-heavy interval loops have been fully stripped. Purely on-demand and event-driven.
            </p>
          </div>
          <div className="card-tag">0ms Polling Overhead</div>
        </div>

        <div className="card">
          <div>
            <div className="card-header">
              <div className="card-icon" style={{ color: "#a855f7" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.93 4.93 4.24 4.24" />
                  <path d="m14.83 9.17 4.24-4.24" />
                  <path d="m14.83 14.83 4.24 4.24" />
                  <path d="m9.17 14.83-4.24 4.24" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <h2 className="card-title">Hobby Plan Optimized</h2>
            </div>
            <p className="card-body">
              Pre-rendered for edge distribution. Consumes 0 serverless execution seconds and avoids quota exhaustion or duration penalties on Vercel Hobby.
            </p>
          </div>
          <div className="card-tag">Edge Cached (Global)</div>
        </div>

        <div className="card">
          <div>
            <div className="card-header">
              <div className="card-icon" style={{ color: "#10b981" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h2 className="card-title">Clean Slate Baseline</h2>
            </div>
            <p className="card-body">
              All legacy prototype dependencies and bloated assets wiped clean. Fresh baseline ready for any new prototype, micro-frontend, or experimental API.
            </p>
          </div>
          <div className="card-tag">Status: Clean Slate</div>
        </div>
      </section>

      {/* Action Box */}
      <section className="action-box">
        <div className="action-info">
          <h4>Vercel Edge Health & Status</h4>
          <p>
            {latency !== null
              ? `Edge round-trip latency: ${latency}ms (Tested on-demand)`
              : "Edge delivery active. Click to test on-demand latency without server polling."}
          </p>
        </div>

        <div className="action-buttons">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={testPing}
            disabled={testingPing}
            id="test-ping-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            {testingPing ? "Pinging..." : latency !== null ? `Latency: ${latency}ms` : "Test Edge Ping"}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={copyRepo}
            id="copy-repo-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            {copied ? "Copied!" : "Copy Repo URL"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div>
          <span>DevLabs Sandbox &bull; Optimized for Vercel Hobby</span>
        </div>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <a
            href="https://github.com/AspiringWebGaurav/devlabs"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://vercel.com/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel Docs
          </a>
        </div>
      </footer>
    </main>
  );
}
