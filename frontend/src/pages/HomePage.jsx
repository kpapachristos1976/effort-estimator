import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../services/api';

function HomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectApi.list();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      const project = await projectApi.create(form);
      setProjects([project, ...projects]);
      setShowModal(false);
      setForm({ name: '', description: '' });
      navigate(`/project/${project.id}`);
    } catch (error) {
      alert('Failed to create project');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await projectApi.delete(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      alert('Failed to delete');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Projects</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <h2 style={{ color: '#666', marginBottom: '16px' }}>No projects yet</h2>
          <p style={{ color: '#999', marginBottom: '24px' }}>Create your first project to start estimating</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map(project => (
            <div key={project.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${project.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, marginBottom: '8px' }}>{project.name}</h3>
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(project.id, e)}>Delete</button>
              </div>
              {project.description && <p style={{ color: '#666', marginBottom: '12px' }}>{project.description}</p>}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className={`tag tag-${project.status}`}>{project.status}</span>
                {project.document_filename && <span style={{ fontSize: '12px', color: '#666' }}>{project.document_filename}</span>}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                Created: {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Project Name *</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter project name" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Enter description" rows={3} />
            </div>
            <div className="actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
