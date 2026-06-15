import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_COLORS = { Pending: '#3498DB', Completed: '#27AE60', Overdue: '#E74C3C', Cancelled: '#95a5a6' };

export default function Inspections() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [extinguishers, setExtinguishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ extinguisherId: '', extinguisherSerial: '', scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const canEdit = ['Admin', 'Inspector'].includes(user?.role);

  const fetchData = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    Promise.all([
      api.get('/inspections', { params }),
      api.get('/extinguishers'),
    ]).then(([r1, r2]) => {
      setItems(r1.data.data);
      setExtinguishers(r2.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openAdd = () => { setForm({ extinguisherId: '', extinguisherSerial: '', scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' }); setEditId(null); setError(''); setShowModal(true); };
  const openEdit = (item) => { setForm({ ...item, scheduledDate: item.scheduledDate?.split('T')[0] }); setEditId(item._id); setError(''); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editId) await api.put(`/inspections/${editId}`, form);
      else await api.post('/inspections', form);
      setShowModal(false); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save'); }
  };

  const markComplete = async (id) => {
    await api.put(`/inspections/${id}`, { status: 'Completed', result: 'Pass' });
    fetchData();
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 };

  return (
    <Layout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Inspections</h1>
          <p style={{ color: '#666', fontSize: 13 }}>Schedule and track fire extinguisher inspections</p>
        </div>
        <button onClick={openAdd} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Schedule Inspection
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
          <option value="">All Statuses</option>
          {['Pending', 'Completed', 'Overdue', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Extinguisher', 'Scheduled Date', 'Time', 'Inspector', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No inspections found</td></tr>
              ) : items.map((item, i) => (
                <tr key={item._id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{item.extinguisherSerial || item.extinguisherId}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.scheduledTime}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.inspectorName || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: `${STATUS_COLORS[item.status]}18`, color: STATUS_COLORS[item.status], padding: '3px 10px', borderRadius: 20 }}>{item.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
                    {canEdit && <button onClick={() => openEdit(item)} style={{ padding: '5px 10px', background: '#3498DB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Edit</button>}
                    {canEdit && item.status === 'Pending' && <button onClick={() => markComplete(item._id)} style={{ padding: '5px 10px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Complete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1a1a2e' }}>{editId ? 'Update Inspection' : 'Schedule Inspection'}</h2>
            {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Extinguisher</label>
                  <select value={form.extinguisherId} onChange={(e) => { const ext = extinguishers.find((x) => x._id === e.target.value); setForm({ ...form, extinguisherId: e.target.value, extinguisherSerial: ext?.serialNumber || '' }); }} required style={inputStyle}>
                    <option value="">Select extinguisher...</option>
                    {extinguishers.map((e) => <option key={e._id} value={e._id}>{e.serialNumber} — {e.location}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Time</label>
                  <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} required style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Inspector Name</label>
                  <input type="text" value={form.inspectorName} onChange={(e) => setForm({ ...form, inspectorName: e.target.value })} placeholder="Inspector name" style={inputStyle} />
                </div>
                {editId && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                      {['Pending', 'Completed', 'Overdue', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>{editId ? 'Update' : 'Schedule'}</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
