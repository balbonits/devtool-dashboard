export type Env = 'production' | 'staging' | 'preview';
export type Status = 'failed' | 'running' | 'succeeded' | 'canceled';

/** One build-and-deploy run. All data in this prototype is fictional. */
export type Run = {
  id: string;
  env: Env;
  service: string;
  status: Status;
  sha: string;
  message: string;
  branch: string;
  author: string;
  /** ISO timestamp. */
  started: string;
  /** Seconds; null while running. */
  duration: number | null;
  log: string[];
};

export const ENVS: { id: Env; label: string }[] = [
  { id: 'production', label: 'Production' },
  { id: 'staging', label: 'Staging' },
  { id: 'preview', label: 'Preview' },
];

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'failed', label: 'Failed' },
  { id: 'running', label: 'Running' },
  { id: 'succeeded', label: 'Succeeded' },
  { id: 'canceled', label: 'Canceled' },
];
