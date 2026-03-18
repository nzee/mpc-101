import type { DkgResponse, SignResponse, VerifyResponse } from './types';

const BASE = '/api';

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
  dkg: () => post<DkgResponse>('/dkg'),
  sign: () => post<SignResponse>('/sign'),
  verify: () => post<VerifyResponse>('/verify'),
};
