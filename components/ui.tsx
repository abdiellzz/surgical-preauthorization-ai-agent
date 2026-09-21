'use client';
import { useEffect, useId, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  FileWarning,
  ShieldAlert,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Decision } from '@/lib/types';
export const labels: Record<Decision, string> = {
  PRE_APPROVED: 'Pre-approved',
  DOCUMENTS_REQUIRED: 'Documents required',
  HUMAN_REVIEW_REQUIRED: 'Human review',
  NOT_COVERED: 'Not covered',
  WAITING_PERIOD_NOT_COMPLETED: 'Waiting period',
};
const icons = {
  PRE_APPROVED: CheckCircle2,
  DOCUMENTS_REQUIRED: FileWarning,
  HUMAN_REVIEW_REQUIRED: ShieldAlert,
  NOT_COVERED: XCircle,
  WAITING_PERIOD_NOT_COMPLETED: Clock3,
};
export function StatusBadge({ decision }: { decision?: Decision }) {
  const Icon = decision ? icons[decision] : Circle;
  return (
    <span className={`status-badge ${decision ?? 'PENDING'}`}>
      <Icon size={13} aria-hidden="true" />
      {decision ? labels[decision] : 'Pending'}
    </span>
  );
}
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
export function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}
export function DetailSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function EmptyState({
  title = 'No requests found',
  description = 'Try adjusting your filters or create a new request.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Circle size={28} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={18} />
      <div>
        <strong>{message}</strong>
        <p>The request can be retried or sent for manual administrative review.</p>
      </div>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Loading requests">
      <span className="sr-only">Loading requests…</span>
      {Array.from({ length: 5 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-labelledby={id} onClose={onClose}>
      <div className="section-heading">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? 'Not available'}</dd>
    </div>
  );
}
export const formatTime = (ms?: number) => (ms === undefined ? '—' : `${(ms / 1000).toFixed(3)} s`);
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
