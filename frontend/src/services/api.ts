import axios, { AxiosError } from 'axios';
import type { GenerationJob, ApiError, ProviderInfo } from '../types';

const client = axios.create({
  baseURL: '/api',
  timeout: 300_000, // 5 min – generation can be slow
});

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    let message = err.response?.data?.detail;
    if (!message) {
      if (err.response?.status === 500 || err.code === 'ECONNREFUSED') {
        message = 'Backend sunucusuna bağlanılamadı. Lütfen backend sunucusunun (port 8001) çalıştığından emin olun.';
      } else {
        message = err.message || 'Bilinmeyen bir hata oluştu.';
      }
    }
    return Promise.reject(new Error(message));
  }
);

/** Start a text-to-3D generation job */
export async function createTextTo3DJob(prompt: string): Promise<GenerationJob> {
  const { data } = await client.post<GenerationJob>('/generate/text-to-3d', {
    prompt,
  });
  return data;
}

/** Start an image-to-3D generation job */
export async function createImageTo3DJob(image: File): Promise<GenerationJob> {
  const form = new FormData();
  form.append('file', image);
  const { data } = await client.post<GenerationJob>(
    '/generate/image-to-3d',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

/** Poll a job's current status */
export async function getJob(jobId: string): Promise<GenerationJob> {
  const { data } = await client.get<GenerationJob>(`/generate/jobs/${jobId}`);
  return data;
}

/** List all jobs */
export async function listJobs(): Promise<GenerationJob[]> {
  const { data } = await client.get<GenerationJob[]>('/generate/jobs');
  return data;
}

/** Get available AI providers */
export async function getProviders(): Promise<ProviderInfo[]> {
  const { data } = await client.get<ProviderInfo[]>('/models/providers');
  return data;
}

/** Build a download URL for a job's model file */
export function getModelDownloadUrl(jobId: string, format: string): string {
  return `/api/generate/jobs/${jobId}/download?format=${format}`;
}

export interface SettingsData {
  colab_url?: string | null;
  hf_configured: boolean;
  tripo_configured: boolean;
  meshy_configured: boolean;
}

/** Get system settings including Colab URL */
export async function getSettings(): Promise<SettingsData> {
  const { data } = await client.get<SettingsData>('/settings');
  return data;
}

/** Update Colab tunnel URL */
export async function updateColabUrl(colabUrl: string): Promise<SettingsData> {
  const { data } = await client.post<SettingsData>('/settings', { colab_url: colabUrl });
  return data;
}
