import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'effort_estimator.db');

let db;

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      document_filename TEXT,
      parsed_content TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS estimations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      impacts_dwh INTEGER DEFAULT 0,
      impacts_mtii INTEGER DEFAULT 0,
      impacts_moodys INTEGER DEFAULT 0,
      num_file_extracts INTEGER DEFAULT 0,
      num_data_models INTEGER DEFAULT 0,
      num_tables INTEGER DEFAULT 0,
      num_fields INTEGER DEFAULT 0,
      num_packages INTEGER DEFAULT 0,
      complexity TEXT DEFAULT 'normal',
      analysis_effort REAL DEFAULT 0,
      mtii_implementation_effort REAL DEFAULT 0,
      dwh_implementation_effort REAL DEFAULT 0,
      moodys_implementation_effort REAL DEFAULT 0,
      uat_effort REAL DEFAULT 0,
      production_deployment_effort REAL DEFAULT 0,
      pm_effort REAL DEFAULT 0,
      include_pm INTEGER DEFAULT 1,
      post_rollout_weeks INTEGER DEFAULT 0,
      post_rollout_effort REAL DEFAULT 0,
      data_governance_effort REAL DEFAULT 0,
      total_effort REAL DEFAULT 0,
      user_overrides TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      base_effort_days REAL DEFAULT 1.0,
      complexity_low_factor REAL DEFAULT 0.5,
      complexity_normal_factor REAL DEFAULT 1.0,
      complexity_high_factor REAL DEFAULT 2.0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS estimation_parameters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      value REAL NOT NULL,
      description TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDatabase();
  return db;
}

export function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function getDb() {
  return db;
}

// Helper functions to match better-sqlite3 API
export function prepare(sql) {
  return {
    run: (...params) => {
      db.run(sql, params);
      saveDatabase();
      return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
    },
    get: (...params) => {
      const result = db.exec(sql, params);
      if (result.length === 0 || result[0].values.length === 0) return null;
      const row = {};
      result[0].columns.forEach((col, i) => {
        row[col] = result[0].values[0][i];
      });
      return row;
    },
    all: (...params) => {
      const result = db.exec(sql, params);
      if (result.length === 0) return [];
      return result[0].values.map(row => {
        const obj = {};
        result[0].columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    }
  };
}
