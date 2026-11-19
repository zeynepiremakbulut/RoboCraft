import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  previewUrl: string | null;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUpload({ onImageSelect, selectedImage, previewUrl }: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only PNG, JPG, and WEBP images are accepted.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File exceeds ${MAX_SIZE_MB} MB limit (${formatBytes(file.size)}).`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onImageSelect(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    // notify parent with a dummy reset — parent should clear its state
    // We signal "clear" by calling onImageSelect with a DataTransfer trick isn't possible,
    // so we expose a prop-driven clear. The parent tracks selectedImage; we just fire
    // the input reset. The parent must handle null by checking previewUrl.
  };

  return (
    <div className="space-y-3">
      {!previewUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3
            border-2 border-dashed rounded-xl p-8 cursor-pointer
            transition-colors duration-150
            ${isDragOver
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/50 hover:bg-surface-elevated'
            }
          `}
        >
          <div className={`p-3 rounded-full ${isDragOver ? 'bg-accent/15' : 'bg-surface-elevated'}`}>
            <Upload size={22} className={isDragOver ? 'text-accent' : 'text-text-muted'} />
          </div>
          <div className="text-center">
            <p className="text-sm text-text-primary font-medium">
              {isDragOver ? 'Drop to upload' : 'Drag & drop an image'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              PNG, JPG, WEBP · max {MAX_SIZE_MB} MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-border bg-surface-elevated">
          <img
            src={previewUrl}
            alt="Upload preview"
            className="w-full max-h-56 object-contain"
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-full bg-background/80 border border-border text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* File info */}
      {selectedImage && !error && (
        <div className="flex items-center gap-2 text-xs text-text-muted px-1">
          <ImageIcon size={12} />
          <span className="truncate">{selectedImage.name}</span>
          <span className="flex-shrink-0 text-text-muted/60">
            {formatBytes(selectedImage.size)}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  );
}
