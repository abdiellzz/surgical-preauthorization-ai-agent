'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel card-content">
      <h1>Unable to load this request</h1>
      <p className="subtitle">Please try again or send it for human review.</p>
      <button onClick={reset} style={{ marginTop: 20 }}>
        Try again
      </button>
    </div>
  );
}
