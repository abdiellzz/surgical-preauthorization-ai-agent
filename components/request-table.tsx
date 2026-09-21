'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { RequestSummary } from '@/lib/presentation';
import type { AuthorizationResult } from '@/lib/types';
import { EmptyState, formatDate, formatTime, labels, StatusBadge } from './ui';
export function RequestTable({
  cases,
  results,
  initialSearch = '',
}: {
  cases: RequestSummary[];
  results: Record<string, AuthorizationResult>;
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState('');
  const [insurance, setInsurance] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const filtered = cases
    .filter(
      (c) =>
        (!status || (results[c.id]?.decision ?? 'PENDING') === status) &&
        (!insurance || c.insurance === insurance) &&
        (!date || c.submitted === date) &&
        `${c.id} ${c.patient} ${c.procedure}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'patient'
        ? a.patient.localeCompare(b.patient)
        : sort === 'id'
          ? a.id.localeCompare(b.id)
          : sort === 'oldest'
            ? a.submitted.localeCompare(b.submitted)
            : b.submitted.localeCompare(a.submitted),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const rows = filtered.slice(start, start + size);
  const reset = () => {
    setSearch('');
    setStatus('');
    setInsurance('');
    setDate('');
    setPage(1);
  };
  return (
    <section className="panel">
      <div className="panel-heading">
        <div className="section-title">
          <h2>Requests</h2>
          <span className="count">{cases.length}</span>
        </div>
        <span className="muted small-text">Latest administrative status</span>
      </div>
      <div className="filter-bar">
        <div className="table-search">
          <Search size={16} />
          <input
            type="search"
            aria-label="Search requests"
            placeholder="Search by ID, patient or procedure"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <label className="filter-select">
          <SlidersHorizontal size={14} />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            {Object.entries(labels).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <select
          aria-label="Filter by insurance"
          value={insurance}
          onChange={(e) => {
            setInsurance(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All insurers</option>
          {[...new Set(cases.map((c) => c.insurance))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input
          aria-label="Filter by submitted date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
        />
        <label className="filter-select">
          <ArrowDownUp size={14} />
          <select aria-label="Sort requests" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="patient">Patient A–Z</option>
            <option value="id">Request ID</option>
          </select>
        </label>
        {(search || status || insurance || date) && (
          <button className="text-button" onClick={reset}>
            Clear filters
          </button>
        )}
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label="Requests table, scroll horizontally for more columns"
      >
        <table>
          <thead>
            <tr>
              {[
                'Request ID',
                'Patient',
                'Procedure',
                'Hospital',
                'Insurance',
                'Submitted',
                'Status',
                'Processing time',
                'Actions',
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link className="request-id" href={`/requests/${c.id}`}>
                    {c.id}
                  </Link>
                </td>
                <td>
                  <div className="patient-cell">
                    <span className="patient-avatar" aria-hidden="true">
                      {c.patient
                        .split(' ')
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join('')}
                    </span>
                    <span>{c.patient}</span>
                  </div>
                </td>
                <td className="procedure-cell">{c.procedure}</td>
                <td className="wrap-cell">{c.hospital}</td>
                <td className="wrap-cell">{c.insurance}</td>
                <td className="date-cell">{formatDate(c.submitted)}</td>
                <td>
                  <StatusBadge decision={results[c.id]?.decision} />
                </td>
                <td className="numeric muted">{formatTime(results[c.id]?.processingTimeMs)}</td>
                <td>
                  <Link
                    className="table-link"
                    href={`/requests/${c.id}`}
                    aria-label={`View request ${c.id}`}
                  >
                    View
                    <ArrowUpRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <EmptyState />}
      <div className="pagination">
        <span>
          {filtered.length
            ? `Showing ${start + 1}–${Math.min(start + size, filtered.length)} of ${filtered.length} requests`
            : '0 requests'}
        </span>
        <div>
          <label>
            Rows per page{' '}
            <select
              aria-label="Rows per page"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
