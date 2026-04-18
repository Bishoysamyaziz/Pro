export interface CheckpointData {
  id: string; timestamp: number; step: number;
  data: Record<string, unknown>; version: string;
}

const PREFIX = 'mostasharai_cp_';

export const saveCheckpoint = (id: string, data: Record<string, unknown>, step = 0): CheckpointData => {
  const cp: CheckpointData = { id, timestamp: Date.now(), step, data, version: '2.0.0' };
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(`${PREFIX}${id}`, JSON.stringify(cp)); } catch {}
  }
  return cp;
};

export const restoreCheckpoint = (id: string): CheckpointData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const checkpointExists = (id: string) => restoreCheckpoint(id) !== null;
export const deleteCheckpoint = (id: string) => { if (typeof window !== 'undefined') localStorage.removeItem(`${PREFIX}${id}`); };
