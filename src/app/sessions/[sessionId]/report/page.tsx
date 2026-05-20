'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/use-auth';
import { sessionsApi } from '@/lib/api/sessions-api';
import { ApiError } from '@/lib/api';
import type { SessionReportDTO } from '@/types/api';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatDateStr(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SessionReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';
  const [report, setReport] = useState<SessionReportDTO | null>(null);
  const [loading, setLoading] = useState(!isPatient);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    if (isPatient) {
      return;
    }

    let cancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        const data = await sessionsApi.getReport(sessionId);
        if (!cancelled) {
          setReport(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setErrorStatus(err.status);
            if (err.status === 401) {
              setError('Please log in');
            } else if (err.status === 403) {
              setError('Access denied');
            } else if (err.status === 404) {
              setError('Session not found');
            } else {
              setError('Failed to load report');
            }
          } else {
            setError('Failed to load report');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchReport();
    return () => { cancelled = true; };
  }, [sessionId, isPatient]);

  // Patient guard
  if (isPatient) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-medium text-red-700">Access denied</p>
        <p className="mt-1 text-sm text-slate-600">You do not have permission to view session reports.</p>
        <Link href={`/sessions/${sessionId}`} className="no-print mt-4 inline-block text-sm text-slate-500 hover:text-slate-800">
          &larr; Back to Session
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="font-medium text-slate-800">{error}</p>
        {errorStatus === 404 && (
          <p className="text-sm text-slate-600">The session with ID {sessionId} does not exist.</p>
        )}
        <Link href={`/sessions/${sessionId}`} className="no-print text-sm text-slate-500 hover:text-slate-800">
          &larr; Back to Session
        </Link>
      </div>
    );
  }

  if (!report) return null;

  const patientName = `${report.patient.first_name} ${report.patient.last_name}`;
  const generatedDate = formatDateStr(report.generated_at).split(',')[0] ?? report.generated_at;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-family: serif; font-size: 12pt; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto p-6 space-y-6 font-sans text-slate-800">
        {/* Header banner */}
        <div className="border border-slate-800 rounded-lg p-4 text-center space-y-1">
          <h1 className="text-xl font-bold tracking-wide">VRAINHAX — Session Report</h1>
          <p className="text-sm text-slate-600">
            Patient: {patientName} | {generatedDate}
          </p>
        </div>

        {/* Session Info */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 pb-1">Session Info</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-slate-500">Status: </span>
              <span className="font-medium">{report.session.status}</span>
            </div>
            {report.session.duration_seconds !== undefined && (
              <div>
                <span className="text-slate-500">Duration: </span>
                <span className="font-medium">{formatDuration(report.session.duration_seconds)}</span>
              </div>
            )}
            {report.device && (
              <div>
                <span className="text-slate-500">Device: </span>
                <span className="font-medium">
                  {report.device.device_name}
                  {report.device.serial_number ? ` (${report.device.serial_number})` : ''}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Therapist: </span>
              <span className="font-medium">
                {report.therapist.name ?? report.therapist.email ?? report.therapist.user_id}
              </span>
            </div>
            {report.session.started_at && (
              <div>
                <span className="text-slate-500">Started: </span>
                <span className="font-medium">{formatDateStr(report.session.started_at)}</span>
              </div>
            )}
            {report.session.ended_at && (
              <div>
                <span className="text-slate-500">Ended: </span>
                <span className="font-medium">{formatDateStr(report.session.ended_at)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Metrics */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 pb-1">Metrics</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Events', value: report.summary.total_events },
              { label: 'Total Commands', value: report.summary.total_commands },
              { label: 'Metrics Received', value: report.summary.total_metrics },
              { label: 'Delivered', value: report.summary.delivered_commands },
              { label: 'Failed', value: report.summary.failed_commands },
              { label: 'Timeout', value: report.summary.timeout_commands },
              ...(report.summary.last_score !== undefined
                ? [{ label: 'Last Score', value: report.summary.last_score }]
                : []),
              ...(report.summary.total_repetitions !== undefined
                ? [{ label: 'Repetitions', value: report.summary.total_repetitions }]
                : []),
              ...(report.summary.elapsed_seconds !== undefined
                ? [{ label: 'Elapsed', value: `${report.summary.elapsed_seconds}s` }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-semibold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Highlights */}
        {report.summary.highlights.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 pb-1">Highlights</h2>
            <ul className="space-y-1">
              {report.summary.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-green-700">
                  <span className="shrink-0">&#10003;</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Warnings */}
        {report.summary.warnings.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 pb-1">Warnings</h2>
            <ul className="space-y-1">
              {report.summary.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="shrink-0">&#9888;</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sections */}
        {report.sections.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 pb-1">Details</h2>
            {report.sections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-700">{sec.title}</h3>
                <ul className="space-y-0.5 pl-4">
                  {sec.items.map((item) => (
                    <li key={item} className="text-sm text-slate-600 list-disc">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* Timeline */}
        {report.timeline.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 pb-1">
              Timeline (last {report.timeline.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Timestamp</th>
                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Kind</th>
                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Title</th>
                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Status</th>
                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.timeline.map((item) => (
                    <tr key={item.timeline_id}>
                      <td className="px-2 py-1.5 text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          item.kind === 'command' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {item.kind}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-slate-700">{item.title}</td>
                      <td className="px-2 py-1.5 text-slate-600">{item.status ?? '—'}</td>
                      <td className="px-2 py-1.5 text-slate-500">{item.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 text-xs text-slate-400 space-y-1">
          <p>Generated: {report.generated_at} | report_id: {report.report_id}</p>
        </div>

        {/* Actions */}
        <div className="no-print flex items-center justify-between pt-2">
          <Link
            href={`/sessions/${sessionId}`}
            className="no-print rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            &larr; Back to Session
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </>
  );
}
