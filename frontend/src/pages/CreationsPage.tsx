import { useEffect, useState } from 'react';
import { Layers, Wand2, Image, Eye, AlertCircle, Download } from 'lucide-react';
import type { GenerationJob } from '../types';
import { listJobs, getModelDownloadUrl } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import ModelViewer from '../viewer/ModelViewer';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, max = 60): string {
  return text.length <= max ? text : text.slice(0, max) + '…';
}

export function CreationsPage() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null);

  useEffect(() => {
    setLoading(true);
    listJobs()
      .then((data) => {
        // newest first
        setJobs([...data].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-muted text-sm animate-pulse">Loading creations…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border flex items-center gap-3">
        <Layers size={18} className="text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">My Creations</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {jobs.length} model{jobs.length !== 1 ? 's' : ''} generated
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
            <Layers size={28} className="text-text-muted" />
          </div>
          <p className="text-text-secondary text-sm font-medium">
            No models generated yet
          </p>
          <p className="text-text-muted text-xs">
            Go to Create to get started.
          </p>
        </div>
      ) : selectedJob && ModelViewer ? (
        /* Full-panel viewer for selected job */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-8 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedJob(null)}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
              >
                ← Back to gallery
              </button>
              <span className="text-text-muted text-xs">|</span>
              <StatusBadge status={selectedJob.status} />
              <span className="text-xs font-mono text-text-muted truncate">
                {selectedJob.id}
              </span>
            </div>
            {selectedJob.model_url && (
              <a
                href={selectedJob.model_url}
                download={`robot-model-${selectedJob.id.slice(0, 8)}.glb`}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Download size={13} />
                Download GLB
              </a>
            )}
          </div>
          <div className="flex-1 min-h-0">
            {selectedJob.model_url ? (
              <ModelViewer
                modelUrl={selectedJob.model_url}
                jobId={selectedJob.id}
                format={selectedJob.format}
                onDownload={(fmt) => { window.location.href = getModelDownloadUrl(selectedJob.id, fmt); }}
              />
            ) : selectedJob.status === 'failed' ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-lg mx-auto gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Generation Failed</h3>
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-mono break-words text-left w-full">
                  {selectedJob.error || 'An unexpected error occurred during generation.'}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                No model file available
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid */
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="text-left group bg-surface border border-border rounded-xl p-4
                  hover:border-accent/50 hover:bg-surface-elevated transition-colors duration-150"
              >
                {/* Thumbnail or placeholder */}
                <div className="w-full aspect-square rounded-lg bg-surface-elevated border border-border mb-3 overflow-hidden flex items-center justify-center">
                  {job.thumbnail_url ? (
                    <img
                      src={job.thumbnail_url}
                      alt="Model thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-text-muted opacity-30">
                      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
                        <path d="M24 4L44 16v16L24 44 4 32V16L24 4z" />
                        <path d="M24 4v40M4 16l20 12 20-12" strokeDasharray="4 2" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusBadge status={job.status} />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-elevated border border-border text-text-muted">
                    {job.mode === 'text-to-3d'
                      ? <><Wand2 size={10} />Text</>
                      : <><Image size={10} />Image</>
                    }
                  </span>
                </div>

                {/* Prompt snippet */}
                <p className="text-xs text-text-secondary leading-relaxed mb-2 line-clamp-2">
                  {job.prompt
                    ? truncate(job.prompt)
                    : job.image_filename
                    ? `Image: ${job.image_filename}`
                    : 'Image upload'}
                </p>

                {/* Date + view hint */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{formatDate(job.created_at)}</span>
                  <span className="text-xs text-accent opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <Eye size={11} /> View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
