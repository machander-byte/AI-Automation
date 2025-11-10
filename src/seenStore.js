import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import config from './config.js';

const dbDir = config.dataDir;
fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'seen.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS seen (
    url TEXT PRIMARY KEY,
    first_seen INTEGER
  )
`);

const selectStmt = db.prepare('SELECT 1 FROM seen WHERE url = ?');
const insertStmt = db.prepare(
  'INSERT OR IGNORE INTO seen (url, first_seen) VALUES (?, ?)'
);

export function isSeen(url) {
  if (!url) return false;
  try {
    return Boolean(selectStmt.get(url));
  } catch (err) {
    console.warn('seenStore:isSeen error', err);
    return false;
  }
}

export function markSeen(url) {
  if (!url) return;
  try {
    insertStmt.run(url, Math.floor(Date.now() / 1000));
  } catch (err) {
    console.warn('seenStore:markSeen error', err);
  }
}
