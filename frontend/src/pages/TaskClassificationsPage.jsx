import { useState, useEffect } from 'react';
import { taskClassificationApi } from '../services/api';

function TaskClassificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'DWH',
    base_effort_days: 1,
    complexity_low_factor: 0.5,
    complexity_normal_factor: 1,
    complexity_high_factor: 2,
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await taskClassificationApi.list();
      setItems(data);
    } catch (error) {
      console.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await taskClassificationApi.update(editId, form);
      } else {
        await taskClassificationApi.create(form);
      }
      await loadItems();
      closeModal();
    } catch (error) {
      alert('Failed to save');
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category,
      base_effort_days: item.base_effort_days,
      complexity_low_factor: item.complexity_low_factor,
      complexity_normal_factor: item.complexity_normal_factor,
      complexity_high_factor: item.complexity_high_factor,
    });
    setEditId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this classification?')) return;
    try {
      await taskClassificationApi.delete(id);
      await loadItems();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({
      name: '',
      category: 'DWH',
      base_effort_days: 1,
      complexity_low_factor: 0.5,
      complexity_normal_factor: 1,
      complexity_high_factor: 2,
    });
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Task Classifications</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add</button>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>No task classifications defined yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Base Effort</th>
                <th>Low</th>
                <th>Normal</th>
                <th>High</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><span className={`tag tag-${item.category.toLowerCase()}`}>{item.category}</span></td>
                  <td>{item.base_effort_days}</td>
                  <td>{item.complexity_low_factor}</td>
                  <td>{item.complexity_normal_factor}</td>
                  <td>{item.complexity_high_factor}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '5px' }} onClick={() => handleEdit(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit' : 'Add'} Task Classification</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="form-group">
              <label>Name</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="DWH">DWH</option>
                <option value="MTII">MTII</option>
                <option value="Moody's">Moody's</option>
                <option value="Analysis">Analysis</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Base Effort (days)</label>
              <input type="number" className="form-control" step="0.1" value={form.base_effort_days} onChange={e => setForm({...form, base_effort_days: parseFloat(e.target.value)})} />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Low Factor</label>
                <input type="number" className="form-control" step="0.1" value={form.complexity_low_factor} onChange={e => setForm({...form, complexity_low_factor: parseFloat(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Normal Factor</label>
                <input type="number" className="form-control" step="0.1" value={form.complexity_normal_factor} onChange={e => setForm({...form, complexity_normal_factor: parseFloat(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>High Factor</label>
                <input type="number" className="form-control" step="0.1" value={form.complexity_high_factor} onChange={e => setForm({...form, complexity_high_factor: parseFloat(e.target.value)})} />
              </div>
            </div>

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

export default TaskClassificationsPage;
