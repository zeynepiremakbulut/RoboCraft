import { useCallback, useEffect, useRef, useState } from 'react';
import { Wand2, Image } from 'lucide-react';
import type { GenerationJob, GenerationMode } from '../types';
import { createTextTo3DJob, createImageTo3DJob, getJob, getModelDownloadUrl } from '../services/api';
import { ProgressPanel } from '../components/ProgressPanel';
import { ImageUpload } from '../components/ImageUpload';
import ModelViewer from '../viewer/ModelViewer';

const POLL_INTERVAL_MS = 3000;

function EmptyViewer() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-20 h-20 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="w-10 h-10 text-text-muted"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M24 4L44 16v16L24 44 4 32V16L24 4z" />
          <path d="M24 4v40M4 16l20 12 20-12" strokeDasharray="4 2" />
        </svg>
      </div>
      <div>
        <p className="text-text-secondary text-sm font-medium">No model yet</p>
        <p className="text-text-muted text-xs mt-1">
          Generate a model to see it here
        </p>
      </div>
    </div>
  );
}

export function CreatePage() {
  const [mode, setMode] = useState<GenerationMode>('text-to-3d');
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const updated = await getJob(jobId);
        setCurrentJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          stopPolling();
          setIsGenerating(false);
        }
      } catch {
        // ignore transient poll errors
      }
    }, POLL_INTERVAL_MS);
  }, []);

  useEffect(() => () => stopPolling(), []);

  const handleGenerate = async () => {
    setError(null);
    setCurrentJob(null);
    setIsGenerating(true);
    try {
      let job: GenerationJob;
      if (mode === 'text-to-3d') {
        if (!prompt.trim()) {
          setError('Please enter a prompt.');
          setIsGenerating(false);
          return;
        }
        job = await createTextTo3DJob(prompt.trim());
      } else {
        if (!uploadedImage) {
          setError('Please upload an image.');
          setIsGenerating(false);
          return;
        }
        job = await createImageTo3DJob(uploadedImage);
      }
      setCurrentJob(job);
      startPolling(job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (file: File) => {
    setUploadedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleModeChange = (newMode: GenerationMode) => {
    setMode(newMode);
    setError(null);
  };

  const isComplete = currentJob?.status === 'completed';
  const isActive = isGenerating || (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border">
        <h1 className="text-xl font-semibold text-text-primary">
          Bring Your Robot Ideas to Life
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Describe or upload a robot image to generate a 3D model
        </p>
      </div>

      {/* Mode tabs */}
      <div className="px-8 pt-5 flex gap-1">
        {(['text-to-3d', 'image-to-3d'] as GenerationMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${mode === m
                ? 'bg-accent text-white'
                : 'text-text-secondary bg-surface-elevated hover:text-text-primary hover:bg-surface-elevated/80'
              }
            `}
          >
            {m === 'text-to-3d' ? <Wand2 size={14} /> : <Image size={14} />}
            {m === 'text-to-3d' ? 'Text to 3D' : 'Image to 3D'}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-6 px-8 py-6 min-h-0">
        {/* Left — input panel */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="flex-1 flex flex-col gap-3">
            {mode === 'text-to-3d' ? (
              <div className="flex flex-col gap-2 h-full">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A battle-ready humanoid mech with articulated arms and glowing eyes..."
                  rows={8}
                  className="flex-1 w-full bg-surface border border-border rounded-xl px-4 py-3
                    text-sm text-text-primary placeholder-text-muted resize-none
                    focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent
                    transition-colors font-sans"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Upload Image
                </label>
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  selectedImage={uploadedImage}
                  previewUrl={imagePreviewUrl}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-xl
              text-sm font-semibold transition-colors duration-150
              ${isGenerating
                ? 'bg-accent/40 text-white/50 cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent/90 active:scale-[0.99]'
              }
            `}
          >
            <Wand2 size={15} />
            {isGenerating ? 'Generating…' : 'Generate Model'}
          </button>
        </div>

        {/* Right — viewer / result panel */}
        <div className="flex-1 bg-surface rounded-xl border border-border flex items-center justify-center min-h-0 overflow-hidden">
          {isComplete && currentJob?.model_url ? (
            <ModelViewer
              modelUrl={currentJob.model_url}
              jobId={currentJob.id}
              format={currentJob.format}
              onDownload={(fmt) => { window.location.href = getModelDownloadUrl(currentJob.id, fmt); }}
            />
          ) : isActive && currentJob ? (
            <div className="w-full max-w-sm p-6">
              <ProgressPanel job={currentJob} />
            </div>
          ) : (
            <EmptyViewer />
          )}
        </div>
      </div>
    </div>
  );
}
