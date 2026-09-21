import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="panel card-content">
      <h1>Request not found</h1>
      <Link className="table-link" href="/dashboard">
        Return to dashboard →
      </Link>
    </div>
  );
}
