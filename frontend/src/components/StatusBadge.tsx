import type { GenerationStatus } from '../types';

interface StatusBadgeProps {
  status: GenerationStatus;
}

const statusConfig: Record<
  GenerationStatus,
  { label: string; className: string; pulse: boolean }
> = {
  idle: {
    label: 'Idle',
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    pulse: false,
  },
  queued: {
    label: 'Queued',
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    pulse: false,
  },
  uploading: {
    label: 'Uploading',
    className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    pulse: true,
  },
  generating: {
    label: 'Generating',
    className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    pulse: true,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pulse: false,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    pulse: false,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border
        ${config.className}
      `}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full bg-current ${config.pulse ? 'animate-pulse' : ''}`}
      />
      {config.label}
    </span>
  );
}
