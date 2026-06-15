import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['Admin', 'Inspector', 'User'] },
  { path: '/extinguishers', label: 'Extinguishers', icon: '🧯', roles: ['Admin', 'Inspector', 'User'] },
  { path: '/inspections', label: 'Inspections', icon: '🔍', roles: ['Admin', 'Inspector', 'User'] },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧', roles: ['Admin', 'Inspector'] },
  { path: '/reports', label: 'Reports', icon: '📈', roles: ['Admin', 'Inspector'] },
  { path: '/users', label: 'Users', icon: '👥', roles: ['Admin'] },
  { path: '/profile', label: 'Profile', icon: '👤', roles: ['Admin', 'Inspector', 'User'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = NAV.filter((n) => n.roles.includes(user?.role));

  const roleColor = { Admin: '#C0392B', Inspector: '#E67E22', User: '#27AE60' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 70, minHeight: '100vh',
        background: '#1a1a2e', transition: 'width 0.3s', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: '#C0392B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔥</div>
          {sidebarOpen && <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>TWZ FEMS</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, marginBottom: 4, textDecoration: 'none',
                background: active ? 'rgba(192,57,43,0.2)' : 'transparent',
                borderLeft: active ? '3px solid #C0392B' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseOut={(e) => !active && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span style={{ color: active ? '#fff' : '#a0aab4', fontSize: 14, fontWeight: active ? 600 : 400 }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {sidebarOpen && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
              <span style={{ fontSize: 11, fontWeight: 700, background: roleColor[user?.role] || '#666', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>{user?.role}</span>
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px', background: 'rgba(192,57,43,0.2)',
            color: '#e88', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span>🚪</span>{sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: '#C0392B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
