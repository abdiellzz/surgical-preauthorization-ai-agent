'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  History,
  Plug,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from './workspace-context';
import { Modal } from './ui';
const operations = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/review', label: 'Human Review', icon: ShieldCheck },
  { href: '/audit', label: 'Audit Logs', icon: History },
];
const system = [
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
];
function Sidebar({ close }: { close?: () => void }) {
  const pathname = usePathname();
  const { demo, results } = useWorkspace();
  const reviewCount = Object.values(results).filter((r) => r.requiresHumanReview).length;
  return (
    <>
      <Link href="/dashboard" onClick={close} className="brand">
        <span className="brand-symbol">
          <Activity size={21} />
        </span>
        PreAuth
      </Link>
      <div className="workspace-name">
        <span className="workspace-mark">P</span>
        <div>
          Authorization workspace
          <small>{demo ? 'Fictional demo' : 'Administrative operations'}</small>
        </div>
      </div>
      <nav aria-label={close ? 'Mobile navigation' : 'Main navigation'}>
        {[
          ['Operations', operations],
          ['System', system],
        ].map(([name, links]) => (
          <div className="nav-section" key={String(name)}>
            <p>{String(name)}</p>
            {(links as typeof operations).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`nav-link ${pathname === href || (href === '/requests' && pathname.startsWith('/requests/')) ? 'active' : ''}`}
                aria-current={pathname === href ? 'page' : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {href === '/review' && reviewCount > 0 && (
                  <span className="nav-count">{reviewCount}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="environment-note">
          <span className="connection-dot" /> {demo ? 'Demo environment' : 'Protected workspace'}
        </div>
        <div className="profile">
          <span className="avatar">{demo ? 'DA' : 'AD'}</span>
          <div>
            {demo ? 'Demo Analyst' : 'Administrator'}
            <small>Authorization Analyst</small>
          </div>
        </div>
      </div>
    </>
  );
}
function Header({ openMenu }: { openMenu: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { results, demo } = useWorkspace();
  const needsReview = Object.values(results).filter((r) => r.requiresHumanReview);
  const section =
    [...operations, ...system].find((x) => path === x.href)?.label ??
    (path.startsWith('/requests/') ? 'Requests' : 'Operations');
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      router.push('/login');
    } catch {
      setError('Sign out failed. Please retry.');
    }
  }
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={openMenu}>
          <Menu size={20} />
        </button>
        <span>Operations</span>
        <span className="breadcrumb-divider">/</span>
        <strong>{section}</strong>
        {path.startsWith('/requests/') && (
          <>
            <span className="breadcrumb-divider">/</span>
            <strong>{path.split('/').pop()}</strong>
          </>
        )}
      </div>
      <div className="header-tools">
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/requests?q=${encodeURIComponent(search)}`);
          }}
        >
          <Search size={16} />
          <input
            aria-label="Search workspace requests"
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <details className="popover">
          <summary aria-label="Notifications" className="icon-button">
            <Bell size={19} />
            {needsReview.length > 0 && <span className="notification-dot" />}
          </summary>
          <div className="popover-panel">
            <strong>Notifications</strong>
            <p>
              {needsReview.length
                ? `${needsReview.length} request requires administrative review.`
                : 'No requests require review.'}
            </p>
            <Link href="/review">
              Open review queue <ArrowUpRight size={14} />
            </Link>
          </div>
        </details>
        <details className="popover user-popover">
          <summary aria-label="User menu">
            <span className="avatar small">{demo ? 'DA' : 'AD'}</span>
            <ChevronDown size={14} />
          </summary>
          <div className="popover-panel">
            <strong>{demo ? 'Demo Analyst' : 'Administrator'}</strong>
            <p>{demo ? 'Public fictional workspace' : 'Session expires after one hour'}</p>
            <Link href="/settings">Account settings</Link>
            {!demo && (
              <button className="text-button" onClick={logout}>
                <LogOut size={15} />
                Sign out
              </button>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
        </details>
      </div>
    </header>
  );
}
function ShellContent({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Sidebar />
      </aside>
      <Modal title="Navigation" open={menu} onClose={() => setMenu(false)}>
        <div className="mobile-sidebar">
          <Sidebar close={() => setMenu(false)} />
        </div>
      </Modal>
      <div className="workspace">
        <Header openMenu={() => setMenu(true)} />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>
          <ShieldCheck size={14} />
          <span>
            Fictional data only. Administrative support; not a clinical approval or payment
            guarantee.
          </span>
          <span className="footer-label">PreAuth · Hackathon prototype</span>
        </footer>
      </div>
    </>
  );
}
export function AppShell({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const pathname = usePathname();
  if (pathname === '/login') return children;
  return (
    <WorkspaceProvider demo={demo}>
      <ShellContent>{children}</ShellContent>
    </WorkspaceProvider>
  );
}
