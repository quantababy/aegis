import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function ThemeInitializer() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aegis-theme');
      if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {
      // ignore
    }
  }, []);
  return null;
}

export default function Layout() {
  return (
    <>
      <ThemeInitializer />
      <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
