import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { GenerationJob } from '../types';

interface ProgressPanelProps {
  job: GenerationJob;
}

const statusMessages: Record<string, string> = {
  idle: 'Initialising…',
  queued: 'Waiting in queue…',
  uploading: 'Uploading image…',
  generating: 'Generating 3D model…',
  processing: 'Processing mesh…',
  completed: 'Model ready',
  failed: 'Generation failed',
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ProgressPanel({ job }: ProgressPanelProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(job.created_at).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    if (job.status !== 'completed' && job.status !== 'failed') {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [job.created_at, job.status]);

  const isActive = job.status !== 'completed' && job.status !== 'failed';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className="flex flex-col gap-5 p-6 bg-surface rounded-xl border border-border w-full">
      {/* Status icon + message */}
      <div className="flex items-center gap-3">
        {isActive && (
          <Loader2 size={22} className="text-accent animate-spin flex-shrink-0" />
        )}
        {isCompleted && (
          <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0" />
        )}
        {isFailed && (
          <XCircle size={22} className="text-red-400 flex-shrink-0" />
        )}
        <span className="text-text-primary font-medium text-sm">
          {statusMessages[job.status] ?? job.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Progress</span>
          <span>{job.progress}%</span>
        </div>
        <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFailed ? 'bg-red-500' : isCompleted ? 'bg-emerald-500' : 'bg-accent'
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Meta info */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Job ID</span>
          <span className="font-mono text-text-secondary tracking-wide">{job.id.slice(0, 16)}…</span>
        </div>
        {job.provider && (
          <div className="flex justify-between">
            <span className="text-text-muted">Provider</span>
            <span className="text-text-secondary capitalize">{job.provider}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-text-muted">Elapsed</span>
          <span className="font-mono text-text-secondary">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Error message */}
      {isFailed && job.error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {job.error}
        </div>
      )}
    </div>
  );
}
