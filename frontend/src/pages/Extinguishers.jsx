import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_COLORS = { Active: '#27AE60', Expired: '#E74C3C', 'Under Maintenance': '#E67E22', Decommissioned: '#95a5a6' };

const EMPTY_FORM = { serialNumber: '', location: '', type: 'Water', size: '5 lb', installationDate: '', expiryDate: '', status: 'Active', notes: '' };

export default function Extinguishers() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const canEdit = ['Admin', 'Inspector'].includes(user?.role);

  const fetchData = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (search) params.location = search;
    api.get('/extinguishers', { params })
      .then((r) => setItems(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setError(''); setShowModal(true); };
  const openEdit = (item) => { setForm({ ...item, installationDate: item.installationDate?.split('T')[0], expiryDate: item.expiryDate?.split('T')[0] }); setEditId(item._id); setError(''); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editId) await api.put(`/extinguishers/${editId}`, form);
      else await api.post('/extinguishers', form);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this extinguisher?')) return;
    await api.delete(`/extinguishers/${id}`);
    fetchData();
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 };

  return (
    <Layout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Fire Extinguishers</h1>
          <p style={{ color: '#666', fontSize: 13 }}>Manage all fire extinguisher records</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Register New
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <input placeholder="Search by location..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} style={{ ...inputStyle, maxWidth: 220 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">All Statuses</option>
          {['Active', 'Expired', 'Under Maintenance', 'Decommissioned'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={fetchData} style={{ padding: '9px 18px', background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Search</button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Serial No.', 'Location', 'Type', 'Size', 'Expiry Date', 'Status', canEdit ? 'Actions' : ''].filter(Boolean).map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No extinguishers found</td></tr>
              ) : items.map((item, i) => (
                <tr key={item._id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#333' }}>{item.serialNumber}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#555' }}>{item.location}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#555' }}>{item.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#555' }}>{item.size}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: `${STATUS_COLORS[item.status]}18`, color: STATUS_COLORS[item.status], padding: '3px 10px', borderRadius: 20 }}>{item.status}</span>
                  </td>
                  {canEdit && (
                    <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(item)} style={{ padding: '5px 12px', background: '#3498DB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                      {user?.role === 'Admin' && <button onClick={() => handleDelete(item._id)} style={{ padding: '5px 12px', background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1a1a2e' }}>{editId ? 'Edit Extinguisher' : 'Register New Extinguisher'}</h2>
            {error && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[['serialNumber', 'Serial Number', 'text'], ['location', 'Location', 'text']].map(([name, label, type]) => (
                  <div key={name}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required style={inputStyle} onFocus={(e) => (e.target.style.borderColor = '#C0392B')} onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                    {['Water', 'CO2', 'Foam', 'Dry Chemical'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Size</label>
                  <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} style={inputStyle}>
                    {['1.5 lb', '5 lb', '9 lb', '12 lb'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Installation Date</label>
                  <input type="date" value={form.installationDate} onChange={(e) => setForm({ ...form, installationDate: e.target.value })} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    {['Active', 'Expired', 'Under Maintenance', 'Decommissioned'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                  {editId ? 'Update' : 'Register'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
