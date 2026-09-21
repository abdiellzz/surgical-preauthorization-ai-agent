import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {
  title: 'Surgical Pre-Authorization | Clarity',
  description: 'Administrative surgical pre-authorization. Fictional hackathon demonstration.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <aside className="sidebar">
          <Link href="/dashboard" className="brand">
            <span className="brand-icon">+</span> clarity<span className="brand-dot">.</span>
          </Link>
          <div className="workspace-label">CARE OPERATIONS</div>
          <nav>
            <Link href="/dashboard">
              ▦ <span>Overview</span>
            </Link>
            <Link href="/review">
              ☷ <span>Human review</span>
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <span className="online-dot" /> Rules engine online
            <p>
              Hackathon workspace
              <br />
              Synthetic data only
            </p>
            <div className="profile">
              <span>AC</span>
              <div>
                Admin Console<small>Demonstration workspace</small>
              </div>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <span>
              Operations <span className="muted"> / </span> Surgical pre-authorization
            </span>
            <span className="demo-tag">DEMO ENVIRONMENT</span>
          </header>
          <main>{children}</main>
          <footer>
            Administrative decision support only. Pre-approval is not a clinical decision or a
            guarantee of payment. All demo records are fictional.
          </footer>
        </div>
      </body>
    </html>
  );
}
