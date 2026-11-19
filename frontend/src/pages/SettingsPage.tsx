import { useEffect, useState } from 'react';
import { Settings, CheckCircle2, AlertTriangle, XCircle, Cpu, ExternalLink, Zap, Check, Server } from 'lucide-react';
import type { ProviderInfo } from '../types';
import { getProviders, getSettings, updateColabUrl } from '../services/api';

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

  // Colab Bridge states
  const [colabUrl, setColabUrl] = useState('');
  const [colabSaved, setColabSaved] = useState(false);
  const [savingColab, setSavingColab] = useState(false);

  const colabNotebookUrl = 'https://colab.research.google.com/github/zeynepiremakbulut/RoboCraft/blob/main/colab/robocraft_3d_bridge.ipynb';

  useEffect(() => {
    Promise.all([getProviders(), getSettings()])
      .then(([provs, settingsData]) => {
        setProviders(provs);
        if (settingsData.colab_url) {
          setColabUrl(settingsData.colab_url);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveColab = async () => {
    setSavingColab(true);
    setError(null);
    try {
      await updateColabUrl(colabUrl.trim());
      setColabSaved(true);
      // Refresh providers
      const updatedProvs = await getProviders();
      setProviders(updatedProvs);
      setTimeout(() => setColabSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Colab bağlantısı kaydedilemedi.');
    } finally {
      setSavingColab(false);
    }
  };

  const availableProviders = providers.filter((p) => p.status === 'available');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border flex items-center gap-3">
        <Settings size={18} className="text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Backend configuration, Colab GPU Bridge & AI providers
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6 max-w-2xl">

        {/* Google Colab GPU Bridge Section */}
        <section className="bg-surface border border-accent/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-accent/10 px-3 py-1 rounded-bl-xl border-l border-b border-accent/20 flex items-center gap-1.5 text-xs text-accent font-medium">
            <Zap size={13} />
            Kotasız & Ücretsiz GPU
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Server className="text-accent" size={18} />
            <h2 className="text-base font-semibold text-text-primary">
              Google Colab T4 GPU Bridge
            </h2>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed mb-4">
            Hugging Face ZeroGPU kotalarına takılmadan, Google'ın ücretsiz 16GB Nvidia T4 GPU'sunu kullanarak sınırsız ve hızlı 3D robot modelleme yapın.
          </p>

          {/* Action step: Open notebook */}
          <div className="bg-surface-elevated/70 border border-border rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted font-medium">
                1. Adım: Hazır Colab Notebook'unu açın ve "Tümünü Çalıştır"a basın
              </span>
              <a
                href={colabNotebookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
              >
                Colab'da Aç
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="text-xs text-text-muted">
              2. Adım: Colab çıktısındaki <code className="text-emerald-400 font-mono">https://xxxx.gradio.live</code> linkini kopyalayıp aşağıya yapıştırın:
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={colabUrl}
                onChange={(e) => setColabUrl(e.target.value)}
                placeholder="https://xxxxxxxx.gradio.live"
                className="flex-1 bg-surface border border-border focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none"
              />
              <button
                onClick={handleSaveColab}
                disabled={savingColab}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {colabSaved ? <Check size={13} /> : null}
                {savingColab ? 'Kaydediliyor…' : colabSaved ? 'Bağlandı!' : 'Bağla & Kaydet'}
              </button>
            </div>
          </div>

          {colabUrl && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={13} />
              Colab GPU Köprüsü Aktif: {colabUrl}
            </div>
          )}
        </section>

        {/* Provider configuration section */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-1">AI Providers</h2>
          <p className="text-xs text-text-muted mb-4">
            API keys and provider status on the backend server.
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
              Google Colab T4 GPU Bridge provides free cloud GPU power. Local inference on this machine requires{' '}
              <span className="text-text-primary font-medium">8+ GB VRAM</span>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
