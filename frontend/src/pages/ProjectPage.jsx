import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, estimationApi } from '../services/api';

function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [project, setProject] = useState(null);
  const [estimations, setEstimations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [form, setForm] = useState({
    project_id: parseInt(id),
    impacts_dwh: false,
    impacts_mtii: false,
    impacts_moodys: false,
    num_file_extracts: 0,
    num_data_models: 0,
    num_tables: 0,
    num_fields: 0,
    num_packages: 0,
    complexity: 'normal',
    include_pm: true,
    post_rollout_weeks: 0,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [proj, ests] = await Promise.all([
        projectApi.get(parseInt(id)),
        projectApi.getEstimations(parseInt(id))
      ]);
      setProject(proj);
      setEstimations(ests);
      
      if (proj.parsed_content?.suggested_impacts) {
        const pc = proj.parsed_content;
        setForm(f => ({
          ...f,
          impacts_dwh: pc.suggested_impacts.dwh || false,
          impacts_mtii: pc.suggested_impacts.mtii || false,
          impacts_moodys: pc.suggested_impacts.moodys || false,
          num_file_extracts: pc.identified_components?.file_extracts || 0,
          num_data_models: pc.identified_components?.data_models || 0,
          num_tables: pc.identified_components?.tables || 0,
          num_fields: pc.identified_components?.fields || 0,
          num_packages: pc.identified_components?.packages || 0,
          complexity: pc.complexity || 'normal',
        }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load project' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setMessage(null);
    
    try {
      await projectApi.upload(parseInt(id), file);
      setMessage({ type: 'success', text: 'Document uploaded and parsed!' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload document' });
    } finally {
      setUploading(false);
    }
  };

  const handleEstimate = async () => {
    setEstimating(true);
    setMessage(null);
    
    try {
      const estimation = await estimationApi.create(form);
      setEstimations([estimation, ...estimations]);
      setMessage({ type: 'success', text: 'Estimation created!' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create estimation' });
    } finally {
      setEstimating(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!project) return <div className="card">Project not found</div>;

  const latest = estimations[0];

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>{project.name}</h1>
            {project.description && <p style={{ color: '#666', margin: '8px 0 0' }}>{project.description}</p>}
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Document Upload */}
      <div className="card">
        <div className="card-header">Document Upload</div>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleUpload} style={{ display: 'none' }} />
        
        {project.document_filename ? (
          <div>
            <p><strong>Uploaded:</strong> {project.document_filename}</p>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ marginTop: '10px' }}>
              {uploading ? 'Uploading...' : 'Replace Document'}
            </button>
            
            {project.parsed_content && (
              <div className="parsed-info">
                <h4>Parsed Content</h4>
                <p><strong>Areas:</strong> {project.parsed_content.identified_areas?.join(', ') || 'None detected'}</p>
                <p><strong>Complexity:</strong> {project.parsed_content.complexity}</p>
                <p><strong>Components:</strong> {Object.entries(project.parsed_content.identified_components || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join(', ') || 'None'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            {uploading ? <p>Uploading...</p> : (
              <>
                <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Click to upload BRD/FSD document</p>
                <p style={{ color: '#666' }}>Supports PDF and DOCX</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Estimation Form */}
      <div className="card">
        <div className="card-header">Estimation Parameters</div>
        
        <div className="form-group">
          <label>Impacted Areas</label>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <label className="checkbox-group">
              <input type="checkbox" checked={form.impacts_dwh} onChange={e => setForm({...form, impacts_dwh: e.target.checked})} />
              DWH
            </label>
            <label className="checkbox-group">
              <input type="checkbox" checked={form.impacts_mtii} onChange={e => setForm({...form, impacts_mtii: e.target.checked})} />
              MTII
            </label>
            <label className="checkbox-group">
              <input type="checkbox" checked={form.impacts_moodys} onChange={e => setForm({...form, impacts_moodys: e.target.checked})} />
              Moody's
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>File Extracts</label>
            <input type="number" className="form-control" min="0" value={form.num_file_extracts} onChange={e => setForm({...form, num_file_extracts: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label>Data Models</label>
            <input type="number" className="form-control" min="0" value={form.num_data_models} onChange={e => setForm({...form, num_data_models: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label>Tables</label>
            <input type="number" className="form-control" min="0" value={form.num_tables} onChange={e => setForm({...form, num_tables: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label>Fields</label>
            <input type="number" className="form-control" min="0" value={form.num_fields} onChange={e => setForm({...form, num_fields: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label>Packages</label>
            <input type="number" className="form-control" min="0" value={form.num_packages} onChange={e => setForm({...form, num_packages: parseInt(e.target.value) || 0})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Complexity</label>
            <select className="form-control" value={form.complexity} onChange={e => setForm({...form, complexity: e.target.value})}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="complex">Complex</option>
            </select>
          </div>
          <div className="form-group">
            <label>Post-Rollout (weeks)</label>
            <input type="number" className="form-control" min="0" value={form.post_rollout_weeks} onChange={e => setForm({...form, post_rollout_weeks: parseInt(e.target.value) || 0})} />
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-group">
            <input type="checkbox" checked={form.include_pm} onChange={e => setForm({...form, include_pm: e.target.checked})} />
            Include Project Management
          </label>
        </div>

        <button className="btn btn-success" onClick={handleEstimate} disabled={estimating}>
          {estimating ? 'Calculating...' : 'Calculate Estimation'}
        </button>
      </div>

      {/* Results */}
      {estimations.length > 0 && (
        <div className="card">
          <div className="card-header">Estimation Results</div>
          
          {latest && (
            <>
              <div className="result-total">
                <div className="label">Total Effort</div>
                <div className="value">{latest.total_effort}</div>
                <div className="label">Man-Days</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Phase / Stream</th>
                    <th style={{ textAlign: 'right' }}>Effort (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Analysis</td><td style={{ textAlign: 'right' }}>{latest.analysis_effort}</td></tr>
                  {latest.impacts_dwh && <tr><td>DWH Implementation</td><td style={{ textAlign: 'right' }}>{latest.dwh_implementation_effort}</td></tr>}
                  {latest.impacts_mtii && <tr><td>MTII Implementation</td><td style={{ textAlign: 'right' }}>{latest.mtii_implementation_effort}</td></tr>}
                  {latest.impacts_moodys && <tr><td>Moody's Implementation</td><td style={{ textAlign: 'right' }}>{latest.moodys_implementation_effort}</td></tr>}
                  <tr><td>UAT</td><td style={{ textAlign: 'right' }}>{latest.uat_effort}</td></tr>
                  <tr><td>Production Deployment</td><td style={{ textAlign: 'right' }}>{latest.production_deployment_effort}</td></tr>
                  <tr><td>Data Governance</td><td style={{ textAlign: 'right' }}>{latest.data_governance_effort}</td></tr>
                  {latest.include_pm && <tr><td>Project Management</td><td style={{ textAlign: 'right' }}>{latest.pm_effort}</td></tr>}
                  {latest.post_rollout_weeks > 0 && <tr><td>Post-Rollout ({latest.post_rollout_weeks} weeks)</td><td style={{ textAlign: 'right' }}>{latest.post_rollout_effort}</td></tr>}
                  <tr style={{ background: '#e8f5e9', fontWeight: 'bold' }}><td>TOTAL</td><td style={{ textAlign: 'right' }}>{latest.total_effort}</td></tr>
                </tbody>
              </table>

              <div className="actions">
                <a href={estimationApi.exportCsv(latest.id)} className="btn btn-primary" download>Export CSV</a>
              </div>
            </>
          )}

          {estimations.length > 1 && (
            <div style={{ marginTop: '30px' }}>
              <h4>History</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Complexity</th>
                    <th>Export</th>
                  </tr>
                </thead>
                <tbody>
                  {estimations.map(est => (
                    <tr key={est.id}>
                      <td>{new Date(est.created_at).toLocaleString()}</td>
                      <td><strong>{est.total_effort}</strong> days</td>
                      <td>{est.complexity}</td>
                      <td><a href={estimationApi.exportCsv(est.id)} className="btn btn-secondary btn-sm" download>CSV</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectPage;
