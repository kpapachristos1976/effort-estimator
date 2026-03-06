import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'effort_estimator.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    document_filename TEXT,
    parsed_content TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS task_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    base_effort_days REAL DEFAULT 1.0,
    complexity_low_factor REAL DEFAULT 0.5,
    complexity_normal_factor REAL DEFAULT 1.0,
    complexity_high_factor REAL DEFAULT 2.0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS estimation_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    value REAL NOT NULL,
    description TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
