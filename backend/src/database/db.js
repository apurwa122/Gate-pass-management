import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/gatepass.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
