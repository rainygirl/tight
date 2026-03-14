import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('tight.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Run migrations inline on startup
function runMigrations() {
	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      topic TEXT,
      is_private INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channel_members (
      channel_id TEXT NOT NULL REFERENCES channels(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY (channel_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      image_url TEXT,
      edited_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
}

runMigrations();

// Incremental migrations
try { sqlite.exec('ALTER TABLE channels ADD COLUMN is_dm INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE channel_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member'"); } catch { /* already exists */ }
try { sqlite.exec('ALTER TABLE messages ADD COLUMN parent_id TEXT'); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN bio TEXT"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN role_title TEXT"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN phone TEXT"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN avatar_source TEXT NOT NULL DEFAULT 'google'"); } catch { /* already exists */ }
