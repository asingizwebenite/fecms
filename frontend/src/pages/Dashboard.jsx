import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 48, height: 48, background: `${color}18`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p style={{ color: '#666', fontSize: 14 }}>Here's what's happening with your fire safety equipment.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Loading dashboard...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard icon="🧯" label="Total Extinguishers" value={data?.extinguishers?.total} color="#C0392B" />
            <StatCard icon="✅" label="Active" value={data?.extinguishers?.active} color="#27AE60" />
            <StatCard icon="⚠️" label="Expired" value={data?.extinguishers?.expired} color="#E74C3C" sub={data?.extinguishers?.expired > 0 ? 'Needs attention' : undefined} />
            <StatCard icon="📅" label="Expiring (30 days)" value={data?.extinguishers?.expiringIn30Days} color="#E67E22" />
            <StatCard icon="🔍" label="Pending Inspections" value={data?.inspections?.pending} color="#3498DB" />
            <StatCard icon="🚨" label="Overdue Inspections" value={data?.inspections?.overdue} color="#E74C3C" sub={data?.inspections?.overdue > 0 ? 'Urgent' : undefined} />
            <StatCard icon="✔️" label="Completed Inspections" value={data?.inspections?.completed} color="#27AE60" />
            <StatCard icon="🔧" label="Maintenance Logs" value={data?.maintenance?.total} color="#9B59B6" />
          </div>

          {/* Quick links */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Quick Actions</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { href: '/extinguishers', label: 'View Extinguishers', icon: '🧯', color: '#C0392B' },
                { href: '/inspections', label: 'Schedule Inspection', icon: '📅', color: '#3498DB' },
                { href: '/maintenance', label: 'Log Maintenance', icon: '🔧', color: '#9B59B6' },
                { href: '/reports', label: 'View Reports', icon: '📊', color: '#27AE60' },
              ].map((a) => (
                <a key={a.href} href={a.href} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                  background: `${a.color}12`, border: `1.5px solid ${a.color}30`,
                  borderRadius: 10, textDecoration: 'none', color: a.color, fontWeight: 600, fontSize: 14,
                }}>
                  <span>{a.icon}</span>{a.label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
