from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime
from document_parser import parse_document
from estimation_engine import calculate_estimation

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
DB_FILE = 'estimator.db'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS estimations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            document_name TEXT,
            impacted_areas TEXT,
            component_counts TEXT,
            complexity TEXT DEFAULT 'medium',
            total_effort REAL,
            breakdown TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );
        
        CREATE TABLE IF NOT EXISTS task_classifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            base_hours REAL,
            description TEXT
        );
        
        CREATE TABLE IF NOT EXISTS estimation_parameters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            value REAL,
            category TEXT,
            description TEXT
        );
    ''')
    
    # Insert default parameters if not exist
    defaults = [
        ('dwh_weight', 0.4, 'stream_weights', 'DWH stream weight'),
        ('mtii_weight', 0.35, 'stream_weights', 'MTII stream weight'),
        ('moodys_weight', 0.25, 'stream_weights', 'Moodys stream weight'),
        ('analysis_pct', 0.15, 'phase_percentages', 'Analysis phase percentage'),
        ('design_pct', 0.10, 'phase_percentages', 'Design phase percentage'),
        ('development_pct', 0.40, 'phase_percentages', 'Development phase percentage'),
        ('testing_pct', 0.25, 'phase_percentages', 'Testing phase percentage'),
        ('deployment_pct', 0.10, 'phase_percentages', 'Deployment phase percentage'),
        ('hours_per_table', 8, 'component_effort', 'Hours per database table'),
        ('hours_per_field', 0.5, 'component_effort', 'Hours per field'),
        ('hours_per_package', 16, 'component_effort', 'Hours per package/module'),
        ('hours_per_report', 12, 'component_effort', 'Hours per report'),
        ('hours_per_interface', 20, 'component_effort', 'Hours per interface'),
        ('pm_overhead_pct', 0.15, 'overhead', 'PM overhead percentage'),
        ('post_rollout_pct', 0.10, 'overhead', 'Post-rollout support percentage'),
        ('low_complexity_mult', 0.7, 'complexity', 'Low complexity multiplier'),
        ('medium_complexity_mult', 1.0, 'complexity', 'Medium complexity multiplier'),
        ('high_complexity_mult', 1.5, 'complexity', 'High complexity multiplier'),
    ]
    
    for name, value, category, desc in defaults:
        conn.execute('''
            INSERT OR IGNORE INTO estimation_parameters (name, value, category, description)
            VALUES (?, ?, ?, ?)
        ''', (name, value, category, desc))
    
    conn.commit()
    conn.close()

# Projects endpoints
@app.route('/api/projects', methods=['GET'])
def get_projects():
    conn = get_db()
    projects = conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(p) for p in projects])

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO projects (name, description) VALUES (?, ?)',
        (data['name'], data.get('description', ''))
    )
    project_id = cursor.lastrowid
    conn.commit()
    project = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    conn.close()
    return jsonify(dict(project)), 201

@app.route('/api/projects/<int:id>', methods=['GET'])
def get_project(id):
    conn = get_db()
    project = conn.execute('SELECT * FROM projects WHERE id = ?', (id,)).fetchone()
    conn.close()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(dict(project))

@app.route('/api/projects/<int:id>', methods=['DELETE'])
def delete_project(id):
    conn = get_db()
    conn.execute('DELETE FROM estimations WHERE project_id = ?', (id,))
    conn.execute('DELETE FROM projects WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return '', 204

# Document upload and parsing
@app.route('/api/projects/<int:id>/upload', methods=['POST'])
def upload_document(id):
    if 'document' not in request.files:
        return jsonify({'error': 'No document provided'}), 400
    
    file = request.files['document']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    
    try:
        parsed = parse_document(filepath)
        return jsonify(parsed)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Estimations endpoints
@app.route('/api/projects/<int:project_id>/estimations', methods=['GET'])
def get_estimations(project_id):
    conn = get_db()
    estimations = conn.execute(
        'SELECT * FROM estimations WHERE project_id = ? ORDER BY created_at DESC',
        (project_id,)
    ).fetchall()
    conn.close()
    result = []
    for e in estimations:
        d = dict(e)
        d['impacted_areas'] = json.loads(d['impacted_areas']) if d['impacted_areas'] else []
        d['component_counts'] = json.loads(d['component_counts']) if d['component_counts'] else {}
        d['breakdown'] = json.loads(d['breakdown']) if d['breakdown'] else {}
        result.append(d)
    return jsonify(result)

@app.route('/api/projects/<int:project_id>/estimations', methods=['POST'])
def create_estimation(project_id):
    data = request.json
    
    conn = get_db()
    params = {}
    for row in conn.execute('SELECT name, value FROM estimation_parameters').fetchall():
        params[row['name']] = row['value']
    
    estimation = calculate_estimation(
        impacted_areas=data.get('impacted_areas', []),
        component_counts=data.get('component_counts', {}),
        complexity=data.get('complexity', 'medium'),
        params=params
    )
    
    cursor = conn.execute('''
        INSERT INTO estimations (project_id, document_name, impacted_areas, component_counts, complexity, total_effort, breakdown)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        project_id,
        data.get('document_name', ''),
        json.dumps(data.get('impacted_areas', [])),
        json.dumps(data.get('component_counts', {})),
        data.get('complexity', 'medium'),
        estimation['total_effort'],
        json.dumps(estimation['breakdown'])
    ))
    
    estimation_id = cursor.lastrowid
    conn.commit()
    
    result = conn.execute('SELECT * FROM estimations WHERE id = ?', (estimation_id,)).fetchone()
    conn.close()
    
    d = dict(result)
    d['impacted_areas'] = json.loads(d['impacted_areas'])
    d['component_counts'] = json.loads(d['component_counts'])
    d['breakdown'] = json.loads(d['breakdown'])
    return jsonify(d), 201

# Export endpoint
@app.route('/api/estimations/<int:id>/export', methods=['GET'])
def export_estimation(id):
    conn = get_db()
    est = conn.execute('SELECT * FROM estimations WHERE id = ?', (id,)).fetchone()
    conn.close()
    
    if not est:
        return jsonify({'error': 'Estimation not found'}), 404
    
    breakdown = json.loads(est['breakdown'])
    
    csv_lines = ['Category,Item,Hours']
    
    if 'phases' in breakdown:
        for phase, hours in breakdown['phases'].items():
            csv_lines.append(f'Phase,{phase},{hours:.1f}')
    
    if 'streams' in breakdown:
        for stream, hours in breakdown['streams'].items():
            csv_lines.append(f'Stream,{stream},{hours:.1f}')
    
    csv_lines.append(f'Total,All,{est["total_effort"]:.1f}')
    
    csv_content = '\n'.join(csv_lines)
    
    return csv_content, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': f'attachment; filename=estimation_{id}.csv'
    }

# Task Classifications endpoints
@app.route('/api/task-classifications', methods=['GET'])
def get_task_classifications():
    conn = get_db()
    tasks = conn.execute('SELECT * FROM task_classifications').fetchall()
    conn.close()
    return jsonify([dict(t) for t in tasks])

@app.route('/api/task-classifications', methods=['POST'])
def create_task_classification():
    data = request.json
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO task_classifications (name, category, base_hours, description)
        VALUES (?, ?, ?, ?)
    ''', (data['name'], data.get('category'), data.get('base_hours', 0), data.get('description')))
    task_id = cursor.lastrowid
    conn.commit()
    task = conn.execute('SELECT * FROM task_classifications WHERE id = ?', (task_id,)).fetchone()
    conn.close()
    return jsonify(dict(task)), 201

@app.route('/api/task-classifications/<int:id>', methods=['PUT'])
def update_task_classification(id):
    data = request.json
    conn = get_db()
    conn.execute('''
        UPDATE task_classifications SET name=?, category=?, base_hours=?, description=?
        WHERE id=?
    ''', (data['name'], data.get('category'), data.get('base_hours', 0), data.get('description'), id))
    conn.commit()
    task = conn.execute('SELECT * FROM task_classifications WHERE id = ?', (id,)).fetchone()
    conn.close()
    return jsonify(dict(task))

@app.route('/api/task-classifications/<int:id>', methods=['DELETE'])
def delete_task_classification(id):
    conn = get_db()
    conn.execute('DELETE FROM task_classifications WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return '', 204

# Parameters endpoints
@app.route('/api/parameters', methods=['GET'])
def get_parameters():
    conn = get_db()
    params = conn.execute('SELECT * FROM estimation_parameters').fetchall()
    conn.close()
    return jsonify([dict(p) for p in params])

@app.route('/api/parameters/<int:id>', methods=['PUT'])
def update_parameter(id):
    data = request.json
    conn = get_db()
    conn.execute('UPDATE estimation_parameters SET value=? WHERE id=?', (data['value'], id))
    conn.commit()
    param = conn.execute('SELECT * FROM estimation_parameters WHERE id = ?', (id,)).fetchone()
    conn.close()
    return jsonify(dict(param))

if __name__ == '__main__':
    init_db()
    print('Server running on http://localhost:3001')
    app.run(host='0.0.0.0', port=3001, debug=True)
