import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_COLORS = { Pending: '#3498DB', Completed: '#27AE60', Overdue: '#E74C3C', Cancelled: '#95a5a6' };
const RESULT_COLORS = { Pass: '#27AE60', Fail: '#E74C3C', 'Needs Attention': '#E67E22' };

const EMPTY_FORM = {
  extinguisherId: '', extinguisherSerial: '', scheduledDate: '', scheduledTime: '',
  inspector: '', inspectorName: '', notes: '',
};

// Valid status transitions from the current status
const ALLOWED_NEXT_STATUSES = {
  Pending:   ['Pending', 'Completed', 'Cancelled', 'Overdue'],
  Overdue:   ['Overdue', 'Completed', 'Cancelled'],
  Completed: ['Completed'],
  Cancelled: ['Cancelled'],
};

export default function Inspections() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [extinguishers, setExtinguishers] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Mini-modal for completing an inspection with a result
  const [completeModal, setCompleteModal] = useState(null); // { id, result }
  const [completeError, setCompleteError] = useState('');

  const isAdmin = user?.role === 'Admin';
  const isInspector = user?.role === 'Inspector';
  const canSchedule = isAdmin;
  const canComplete = isAdmin || isInspector;

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    const requests = [api.get('/inspections', { params }), api.get('/extinguishers')];
    if (isAdmin) requests.push(api.get('/users/inspectors'));

    Promise.all(requests)
      .then(([r1, r2, r3]) => {
        setItems(r1.data.data);
        setExtinguishers(r2.data.data);
        if (r3) setInspectors(r3.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setError(''); setShowModal(true); };
  const openEdit = (item) => {
    setForm({ ...item, scheduledDate: item.scheduledDate?.split('T')[0] });
    setEditId(item.id);
    setError('');
    setShowModal(true);
  };

  const handleExtinguisherChange = (e) => {
    const ext = extinguishers.find((x) => x.id === e.target.value);
    setForm({ ...form, extinguisherId: e.target.value, extinguisherSerial: ext?.serialNumber || '' });
  };

  const handleInspectorChange = (e) => {
    const insp = inspectors.find((x) => x.id === e.target.value);
    setForm({ ...form, inspector: e.target.value, inspectorName: insp ? `${insp.firstName} ${insp.lastName}` : '' });
  };

  // Parse error from either 422 array or single message
  const parseError = (err) =>
    err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to save';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side future datetime check for new inspections
    if (!editId) {
      if (!form.scheduledDate || !form.scheduledTime) {
        return setError('Date and time are required');
      }
      const [year, month, day] = form.scheduledDate.split('-').map(Number);
      const [hours, mins] = form.scheduledTime.split(':').map(Number);
      if (new Date(year, month - 1, day, hours, mins) <= new Date()) {
        return setError('Scheduled date and time must be in the future');
      }
    }

    setSaving(true);
    try {
      if (editId) await api.put(`/inspections/${editId}`, form);
      else await api.post('/inspections', form);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (item) => {
    setCompleteModal({ id: item.id, result: 'Pass' });
    setCompleteError('');
  };

  const confirmComplete = async () => {
    setCompleteError('');
    try {
      await api.put(`/inspections/${completeModal.id}`, { status: 'Completed', result: completeModal.result });
      setCompleteModal(null);
      fetchData();
    } catch (err) {
      setCompleteError(parseError(err));
    }
  };

  const isTerminal = (status) => status === 'Completed' || status === 'Cancelled';

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
  };
  const disabledInput = { ...inputStyle, background: '#f5f5f5', color: '#999', cursor: 'not-allowed' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 };

  return (
    <Layout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Inspections</h1>
          <p style={{ color: '#666', fontSize: 13 }}>Schedule and track fire extinguisher inspections</p>
        </div>
        {canSchedule && (
          <button onClick={openAdd} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Schedule Inspection
          </button>
        )}
      </div>

      {/* Filter */}
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
                {['Extinguisher', 'Scheduled Date', 'Time', 'Inspector', 'Status', 'Result', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No inspections found</td></tr>
              ) : items.map((item, i) => (
                <tr key={item.id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{item.extinguisherSerial || item.extinguisherId}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.scheduledTime || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.inspectorName || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: `${STATUS_COLORS[item.status]}18`, color: STATUS_COLORS[item.status], padding: '3px 10px', borderRadius: 20 }}>{item.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.result ? (
                      <span style={{ fontSize: 12, fontWeight: 700, background: `${RESULT_COLORS[item.result]}18`, color: RESULT_COLORS[item.result], padding: '3px 10px', borderRadius: 20 }}>{item.result}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
                    {isAdmin && (
                      <button onClick={() => openEdit(item)} style={{ padding: '5px 10px', background: '#3498DB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                    )}
                    {canComplete && item.status === 'Pending' && (
                      <button onClick={() => openComplete(item)} style={{ padding: '5px 10px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Complete</button>
                    )}
                    {canComplete && item.status === 'Overdue' && (
                      <button onClick={() => openComplete(item)} style={{ padding: '5px 10px', background: '#E67E22', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Complete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule / Edit modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1a1a2e' }}>
              {editId ? 'Update Inspection' : 'Schedule Inspection'}
            </h2>

            {editId && isTerminal(form.status) && (
              <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 14 }}>
                This inspection is <strong>{form.status}</strong> and cannot be rescheduled.
              </div>
            )}

            {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Extinguisher</label>
                  <select value={form.extinguisherId} onChange={handleExtinguisherChange} required disabled={editId && isTerminal(form.status)} style={editId && isTerminal(form.status) ? disabledInput : inputStyle}>
                    <option value="">Select extinguisher...</option>
                    {extinguishers.map((e) => <option key={e.id} value={e.id}>{e.serialNumber} — {e.location}</option>)}
                  </select>
                </div>

                {isAdmin && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Assign Inspector</label>
                    <select value={form.inspector} onChange={handleInspectorChange} required={!editId} disabled={editId && isTerminal(form.status)} style={editId && isTerminal(form.status) ? disabledInput : inputStyle}>
                      <option value="">Select inspector...</option>
                      {inspectors.map((insp) => (
                        <option key={insp.id} value={insp.id}>{insp.firstName} {insp.lastName} — {insp.email}</option>
                      ))}
                    </select>
                    {inspectors.length === 0 && (
                      <p style={{ fontSize: 12, color: '#E67E22', marginTop: 4 }}>No active inspectors found. Create and activate an inspector account first.</p>
                    )}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    required
                    min={!editId ? todayStr : undefined}
                    disabled={editId && isTerminal(form.status)}
                    style={editId && isTerminal(form.status) ? disabledInput : inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Time</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    required
                    disabled={editId && isTerminal(form.status)}
                    style={editId && isTerminal(form.status) ? disabledInput : inputStyle}
                  />
                </div>

                {editId && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={isTerminal(form.status) ? disabledInput : inputStyle}
                      disabled={isTerminal(form.status)}
                    >
                      {(ALLOWED_NEXT_STATUSES[form.status] || ['Pending', 'Completed', 'Overdue', 'Cancelled']).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editId && (form.status === 'Completed' || form.result) && (
                  <div>
                    <label style={labelStyle}>Result</label>
                    <select
                      value={form.result || ''}
                      onChange={(e) => setForm({ ...form, result: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">— Not set —</option>
                      {['Pass', 'Fail', 'Needs Attention'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px', background: saving ? '#e0a0a0' : '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : editId ? 'Update' : 'Schedule'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete inspection mini-modal */}
      {completeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, color: '#1a1a2e' }}>Mark Inspection Complete</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Select the inspection result before confirming.</p>

            {completeError && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{completeError}</div>}

            <label style={labelStyle}>Inspection Result</label>
            <select
              value={completeModal.result}
              onChange={(e) => setCompleteModal({ ...completeModal, result: e.target.value })}
              style={{ ...inputStyle, marginBottom: 20 }}
            >
              {['Pass', 'Fail', 'Needs Attention'].map((r) => <option key={r}>{r}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmComplete} style={{ flex: 1, padding: '11px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                Confirm Complete
              </button>
              <button onClick={() => setCompleteModal(null)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
