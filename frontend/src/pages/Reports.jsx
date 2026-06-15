import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const Tab = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: active ? '#C0392B' : '#f0f0f0', color: active ? '#fff' : '#555', transition: 'all 0.15s' }}>{label}</button>
);

export default function Reports() {
  const [tab, setTab] = useState('inventory');
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchReport = (t = tab, p = period) => {
    setLoading(true);
    api.get(`/reports/${t}`, { params: { period: p } })
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, [tab, period]);

  const exportFile = async (type, format) => {
    const url = `/api/reports/export/${format}/${type}`;
    const token = localStorage.getItem('accessToken');
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${type}-report.${format}`;
    a.click();
  };

  const Card = ({ label, value, color = '#333' }) => (
    <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Reports & Analytics</h1>
        <p style={{ color: '#666', fontSize: 13 }}>Real-time operational insights</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['inventory', 'Inventory'], ['inspections', 'Inspections'], ['compliance', 'Compliance'], ['maintenance', 'Maintenance']].map(([key, label]) => (
          <Tab key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
        ))}
      </div>

      {/* Period filter (for some tabs) */}
      {['inventory', 'maintenance'].includes(tab) && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          {['all', 'daily', 'monthly', 'yearly'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 14px', border: `1.5px solid ${period === p ? '#C0392B' : '#ddd'}`, borderRadius: 20, background: period === p ? '#fff5f5' : '#fff', color: period === p ? '#C0392B' : '#555', fontWeight: period === p ? 700 : 400, cursor: 'pointer', fontSize: 13, textTransform: 'capitalize' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => exportFile(tab === 'compliance' ? 'compliance' : tab === 'inspections' ? 'inspections' : tab === 'maintenance' ? 'maintenance' : 'extinguishers', 'csv')} style={{ padding: '8px 16px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>⬇ Export CSV</button>
        <button onClick={() => exportFile(tab, 'pdf')} style={{ padding: '8px 16px', background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>⬇ Export PDF</button>
      </div>

      {/* Report content */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading report...</div> : !data ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No data available</div> : (
          <>
            {tab === 'inventory' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <Card label="Total" value={data.total} color="#C0392B" />
                  {Object.entries(data.byStatus || {}).map(([k, v]) => <Card key={k} label={k} value={v} />)}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>By Type</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {Object.entries(data.byType || {}).map(([k, v]) => <Card key={k} label={k} value={v} />)}
                </div>
              </>
            )}
            {tab === 'inspections' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                  <Card label="Total" value={data.summary?.total} />
                  <Card label="Pending" value={data.summary?.pending} color="#3498DB" />
                  <Card label="Completed" value={data.summary?.completed} color="#27AE60" />
                  <Card label="Overdue" value={data.summary?.overdue} color="#E74C3C" />
                </div>
                {data.upcomingPending?.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Upcoming Inspections</h3>
                    {data.upcomingPending.map((i) => <div key={i._id} style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>📅 {i.extinguisherSerial} — {new Date(i.scheduledDate).toLocaleDateString()} at {i.scheduledTime}</div>)}
                  </>
                )}
              </>
            )}
            {tab === 'compliance' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                  <Card label="Total" value={data.summary?.total} />
                  <Card label="Active" value={data.summary?.active} color="#27AE60" />
                  <Card label="Expired" value={data.summary?.expired} color="#E74C3C" />
                  <Card label="Compliance Rate" value={data.summary?.complianceRate} color="#27AE60" />
                </div>
                {data.expiringIn30Days?.count > 0 && (
                  <>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#E67E22', marginBottom: 10 }}>⚠ Expiring Within 30 Days ({data.expiringIn30Days.count})</h3>
                    {data.expiringIn30Days.items.map((e) => <div key={e._id} style={{ padding: '8px 12px', background: '#fef9ec', borderRadius: 8, marginBottom: 6, fontSize: 13, borderLeft: '3px solid #E67E22' }}>{e.serialNumber} — {e.location} — Expires: {new Date(e.expiryDate).toLocaleDateString()}</div>)}
                  </>
                )}
              </>
            )}
            {tab === 'maintenance' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                  <Card label="Total Logs" value={data.total} />
                  <Card label="Total Cost" value={data.totalCost ? `$${data.totalCost}` : '$0'} color="#9B59B6" />
                </div>
                {data.recentActivities?.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Recent Activities</h3>
                    {data.recentActivities.map((m) => <div key={m._id} style={{ padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>🔧 [{m.extinguisherSerial || 'N/A'}] {m.actionTaken} — {m.inspectorName || 'N/A'} — {new Date(m.maintenanceDate).toLocaleDateString()}</div>)}
                  </>
                )}
              </>
            )}
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 20 }}>Generated: {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}</p>
          </>
        )}
      </div>
    </Layout>
  );
}
