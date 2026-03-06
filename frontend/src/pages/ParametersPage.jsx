import { useState, useEffect } from 'react';
import { parameterApi } from '../services/api';

function ParametersPage() {
  const [items, setItems] = useState([]);
  const [defaults, setDefaults] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', value: 0, description: '', category: 'general' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [params, defs] = await Promise.all([parameterApi.list(), parameterApi.defaults()]);
      setItems(params);
      setDefaults(defs);
    } catch (error) {
      console.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await parameterApi.update(editId, { value: form.value, description: form.description });
      } else {
        await parameterApi.create(form);
      }
      await loadData();
      closeModal();
    } catch (error) {
      alert('Failed to save');
    }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name, value: item.value, description: item.description || '', category: item.category || 'general' });
    setEditId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this parameter?')) return;
    try {
      await parameterApi.delete(id);
      await loadData();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({ name: '', value: 0, description: '', category: 'general' });
  };

  if (loading) return <div className="loading">Loading...</div>;

  const grouped = items.reduce((acc, p) => {
    const cat = p.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Estimation Parameters</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Parameter</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666' }}>No custom parameters. System will use defaults.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, params]) => (
          <div key={category} className="card">
            <div className="card-header" style={{ textTransform: 'capitalize' }}>{category.replace(/_/g, ' ')}</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {params.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.name}</code></td>
                    <td><strong>{p.value}</strong></td>
                    <td style={{ color: '#666' }}>{p.description || '-'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" style={{ marginRight: '5px' }} onClick={() => handleEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <div className="card">
        <div className="card-header">Default Parameters (Reference)</div>
        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px' }}>
          {Object.entries(defaults).map(([key, value]) => (
            <div key={key}>{key}: {value}</div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit' : 'Add'} Parameter</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="form-group">
              <label>Name</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!!editId} placeholder="e.g., base_effort_table" />
            </div>
            
            <div className="form-group">
              <label>Value</label>
              <input type="number" className="form-control" step="0.01" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value)})} />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <input type="text" className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            
            {!editId && (
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="general">General</option>
                  <option value="phase_percentage">Phase Percentage</option>
                  <option value="stream_weight">Stream Weight</option>
                  <option value="base_effort">Base Effort</option>
                  <option value="complexity">Complexity</option>
                </select>
              </div>
            )}

            <div className="actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParametersPage;
