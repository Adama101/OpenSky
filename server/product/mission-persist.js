import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MISSIONS_PATH = path.join(__dirname, '../data/missions.json');

export function loadMissionSnapshot(filePath = DEFAULT_MISSIONS_PATH) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed?.missions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMissionSnapshot(missions, auditLog, filePath = DEFAULT_MISSIONS_PATH) {
  const payload = {
    savedAt: new Date().toISOString(),
    missions,
    auditLog,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}
