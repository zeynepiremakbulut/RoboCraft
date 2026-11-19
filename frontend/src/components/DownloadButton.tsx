import { Download } from 'lucide-react';
import { getModelDownloadUrl } from '../services/api';

interface DownloadButtonProps {
  jobId: string;
  format: string;
  label: string;
  available: boolean;
}

export function DownloadButton({ jobId, format, label, available }: DownloadButtonProps) {
  const handleDownload = () => {
    if (!available) return;
    const url = getModelDownloadUrl(jobId, format);
    window.location.href = url;
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!available}
      title={available ? `Download ${label}` : `${label} not available`}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
        border transition-colors duration-150
        ${available
          ? 'border-border bg-surface-elevated text-text-primary hover:bg-accent/10 hover:border-accent hover:text-accent cursor-pointer'
          : 'border-border/50 bg-surface/50 text-text-muted cursor-not-allowed opacity-50'
        }
      `}
    >
      <Download size={12} />
      {label}
    </button>
  );
}
