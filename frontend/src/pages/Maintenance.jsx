import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [extinguishers, setExtinguishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ extinguisherId: '', extinguisherSerial: '', actionTaken: '', maintenanceDate: new Date().toISOString().split('T')[0], issuesIdentified: '', notes: '', recommendations: '', cost: 0 });
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.get('/maintenance'), api.get('/extinguishers')])
      .then(([r1, r2]) => { setLogs(r1.data.data); setExtinguishers(r2.data.data); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/maintenance', form);
      setShowModal(false); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save'); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 };

  return (
    <Layout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Maintenance Logs</h1>
          <p style={{ color: '#666', fontSize: 13 }}>Log and track maintenance activities</p>
        </div>
        <button onClick={() => { setForm({ extinguisherId: '', extinguisherSerial: '', actionTaken: '', maintenanceDate: new Date().toISOString().split('T')[0], issuesIdentified: '', notes: '', recommendations: '', cost: 0 }); setError(''); setShowModal(true); }} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Log Maintenance
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Extinguisher', 'Action Taken', 'Date', 'Inspector', 'Issues', 'Cost'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No maintenance logs found</td></tr>
                : logs.map((log, i) => (
                  <tr key={log._id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{log.extinguisherSerial || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{log.actionTaken}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{log.maintenanceDate ? new Date(log.maintenanceDate).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{log.inspectorName || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: log.issuesIdentified ? '#E74C3C' : '#999' }}>{log.issuesIdentified || 'None'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{log.cost ? `$${log.cost}` : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1a1a2e' }}>Log Maintenance Activity</h2>
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
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Action Taken *</label>
                  <input type="text" value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} required placeholder="e.g. Pressure recharge, Pin replacement..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Maintenance Date</label>
                  <input type="date" value={form.maintenanceDate} onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cost ($)</label>
                  <input type="number" min={0} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Issues Identified</label>
                  <input type="text" value={form.issuesIdentified} onChange={(e) => setForm({ ...form, issuesIdentified: e.target.value })} placeholder="Optional" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Recommendations</label>
                  <textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Save Log</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
