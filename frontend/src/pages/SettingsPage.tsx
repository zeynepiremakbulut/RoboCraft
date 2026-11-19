import { useEffect, useState } from 'react';
import { Settings, CheckCircle2, AlertTriangle, XCircle, Cpu } from 'lucide-react';
import type { ProviderInfo } from '../types';
import { getProviders } from '../services/api';

function ProviderStatusBadge({ status }: { status: ProviderInfo['status'] }) {
  const configs = {
    available: {
      icon: <CheckCircle2 size={12} />,
      label: 'Available',
      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    unconfigured: {
      icon: <AlertTriangle size={12} />,
      label: 'Unconfigured',
      className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    },
    unavailable: {
      icon: <XCircle size={12} />,
      label: 'Unavailable',
      className: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
  };
  const cfg = configs[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProviders()
      .then(setProviders)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const availableProviders = providers.filter((p) => p.status === 'available');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border flex items-center gap-3">
        <Settings size={18} className="text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Backend configuration and AI provider status
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6 max-w-2xl">

        {/* Provider configuration section */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-1">AI Providers</h2>
          <p className="text-xs text-text-muted mb-4">
            API keys are configured via environment variables on the backend server.
            See <code className="font-mono text-text-secondary">.env.example</code>.
          </p>

          {loading && (
            <div className="text-text-muted text-sm animate-pulse">Loading providers…</div>
          )}

          {error && !loading && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3">
              {providers.length === 0 && (
                <p className="text-text-muted text-sm">No providers found.</p>
              )}
              {providers.map((p) => (
                <div
                  key={p.name}
                  className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary">{p.display_name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.supports_text && (
                        <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded border border-border">
                          Text → 3D
                        </span>
                      )}
                      {p.supports_image && (
                        <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded border border-border">
                          Image → 3D
                        </span>
                      )}
                    </div>
                  </div>
                  <ProviderStatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active providers */}
        {availableProviders.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Active Providers</h2>
            <div className="bg-surface border border-border rounded-xl px-5 py-4">
              <ul className="space-y-1">
                {availableProviders.map((p) => (
                  <li key={p.name} className="flex items-center gap-2 text-sm text-text-secondary">
                    <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    {p.display_name}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Hardware note */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Hardware</h2>
          <div className="bg-surface border border-border rounded-xl px-5 py-4 flex items-start gap-3">
            <Cpu size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary leading-relaxed">
              This version uses cloud AI providers. Local inference requires{' '}
              <span className="text-text-primary font-medium">8+ GB VRAM</span>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
