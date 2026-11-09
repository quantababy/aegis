import React from 'react';

export default function Card({ title, children, className = '' }) {
  return (
    <div
      className={`cyber-panel rounded-xl p-5 border shadow-sm transition-colors ${className}`}
      style={{
        backgroundColor: 'var(--color-panel)',
        borderColor: 'var(--color-border)',
      }}
    >
      {title && (
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
