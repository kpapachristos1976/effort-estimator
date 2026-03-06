import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './database.js';
import { calculateEstimation, DEFAULT_PARAMS } from './estimation-engine.js';
import { parseDocument } from './document-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { dirname } from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// File upload setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ============ PROJECTS ============

app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects.map(p => ({
    ...p,
    parsed_content: p.parsed_content ? JSON.parse(p.parsed_content) : null
  })));
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({
    ...project,
    parsed_content: project.parsed_content ? JSON.parse(project.parsed_content) : null
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name, description || null);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM estimations WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

// ============ DOCUMENT UPLOAD ============

app.post('/api/projects/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const filePath = req.file.path;
    const parsed = await parseDocument(filePath);

    db.prepare(`
      UPDATE projects 
      SET document_filename = ?, parsed_content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(req.file.originalname, JSON.stringify(parsed), req.params.id);

    res.json({ message: 'Document uploaded and parsed', filename: req.file.originalname, parsed });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ ESTIMATIONS ============

app.post('/api/estimate', (req, res) => {
  const input = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(input.project_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const results = calculateEstimation(input);

  const stmt = db.prepare(`
    INSERT INTO estimations (
      project_id, impacts_dwh, impacts_mtii, impacts_moodys,
      num_file_extracts, num_data_models, num_tables, num_fields, num_packages,
      complexity, include_pm, post_rollout_weeks, user_overrides,
      analysis_effort, mtii_implementation_effort, dwh_implementation_effort,
      moodys_implementation_effort, uat_effort, production_deployment_effort,
      pm_effort, post_rollout_effort, data_governance_effort, total_effort
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.project_id,
    input.impacts_dwh ? 1 : 0,
    input.impacts_mtii ? 1 : 0,
    input.impacts_moodys ? 1 : 0,
    input.num_file_extracts || 0,
    input.num_data_models || 0,
    input.num_tables || 0,
    input.num_fields || 0,
    input.num_packages || 0,
    input.complexity || 'normal',
    input.include_pm ? 1 : 0,
    input.post_rollout_weeks || 0,
    input.user_overrides ? JSON.stringify(input.user_overrides) : null,
    results.analysis_effort,
    results.mtii_implementation_effort,
    results.dwh_implementation_effort,
    results.moodys_implementation_effort,
    results.uat_effort,
    results.production_deployment_effort,
    results.pm_effort,
    results.post_rollout_effort,
    results.data_governance_effort,
    results.total_effort
  );

  db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('estimated', input.project_id);

  const estimation = db.prepare('SELECT * FROM estimations WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    ...estimation,
    impacts_dwh: !!estimation.impacts_dwh,
    impacts_mtii: !!estimation.impacts_mtii,
    impacts_moodys: !!estimation.impacts_moodys,
    include_pm: !!estimation.include_pm
  });
});

app.get('/api/projects/:id/estimations', (req, res) => {
  const estimations = db.prepare('SELECT * FROM estimations WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(estimations.map(e => ({
    ...e,
    impacts_dwh: !!e.impacts_dwh,
    impacts_mtii: !!e.impacts_mtii,
    impacts_moodys: !!e.impacts_moodys,
    include_pm: !!e.include_pm
  })));
});

// ============ EXPORT ============

app.get('/api/estimations/:id/export/csv', (req, res) => {
  const estimation = db.prepare('SELECT * FROM estimations WHERE id = ?').get(req.params.id);
  if (!estimation) return res.status(404).json({ error: 'Estimation not found' });

  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(estimation.project_id);

  const csv = [
    'Effort Estimation Report',
    `Project,${project.name}`,
    '',
    'Phase/Stream,Effort (Man-Days)',
    `Analysis,${estimation.analysis_effort}`,
    `DWH Implementation,${estimation.dwh_implementation_effort}`,
    `MTII Implementation,${estimation.mtii_implementation_effort}`,
    `Moody's Implementation,${estimation.moodys_implementation_effort}`,
    `UAT,${estimation.uat_effort}`,
    `Production Deployment,${estimation.production_deployment_effort}`,
    `Data Governance,${estimation.data_governance_effort}`,
    `Project Management,${estimation.pm_effort}`,
    `Post-Rollout Support,${estimation.post_rollout_effort}`,
    '',
    `TOTAL,${estimation.total_effort}`
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=estimation_${estimation.id}.csv`);
  res.send(csv);
});

// ============ TASK CLASSIFICATIONS ============

app.get('/api/task-classifications', (req, res) => {
  const classifications = db.prepare('SELECT * FROM task_classifications WHERE is_active = 1').all();
  res.json(classifications);
});

app.post('/api/task-classifications', (req, res) => {
  const { name, category, base_effort_days, complexity_low_factor, complexity_normal_factor, complexity_high_factor } = req.body;
  const result = db.prepare(`
    INSERT INTO task_classifications (name, category, base_effort_days, complexity_low_factor, complexity_normal_factor, complexity_high_factor)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, base_effort_days || 1, complexity_low_factor || 0.5, complexity_normal_factor || 1, complexity_high_factor || 2);
  
  const tc = db.prepare('SELECT * FROM task_classifications WHERE id = ?').get(result.lastInsertRowid);
  res.json(tc);
});

app.put('/api/task-classifications/:id', (req, res) => {
  const { name, category, base_effort_days, complexity_low_factor, complexity_normal_factor, complexity_high_factor } = req.body;
  db.prepare(`
    UPDATE task_classifications 
    SET name = ?, category = ?, base_effort_days = ?, complexity_low_factor = ?, complexity_normal_factor = ?, complexity_high_factor = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, category, base_effort_days, complexity_low_factor, complexity_normal_factor, complexity_high_factor, req.params.id);
  
  const tc = db.prepare('SELECT * FROM task_classifications WHERE id = ?').get(req.params.id);
  res.json(tc);
});

app.delete('/api/task-classifications/:id', (req, res) => {
  db.prepare('UPDATE task_classifications SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ============ PARAMETERS ============

app.get('/api/parameters', (req, res) => {
  const params = db.prepare('SELECT * FROM estimation_parameters').all();
  res.json(params);
});

app.get('/api/parameters/defaults', (req, res) => {
  res.json(DEFAULT_PARAMS);
});

app.post('/api/parameters', (req, res) => {
  const { name, value, description, category } = req.body;
  try {
    const result = db.prepare('INSERT INTO estimation_parameters (name, value, description, category) VALUES (?, ?, ?, ?)').run(name, value, description, category);
    const param = db.prepare('SELECT * FROM estimation_parameters WHERE id = ?').get(result.lastInsertRowid);
    res.json(param);
  } catch (error) {
    res.status(400).json({ error: 'Parameter already exists' });
  }
});

app.put('/api/parameters/:id', (req, res) => {
  const { value, description } = req.body;
  db.prepare('UPDATE estimation_parameters SET value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(value, description, req.params.id);
  const param = db.prepare('SELECT * FROM estimation_parameters WHERE id = ?').get(req.params.id);
  res.json(param);
});

app.delete('/api/parameters/:id', (req, res) => {
  db.prepare('DELETE FROM estimation_parameters WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
