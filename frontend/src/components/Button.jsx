import React from 'react';

export default function Button({ onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:opacity-90 ${className}`}
      style={{
        backgroundColor: 'var(--color-accent)',
        color: '#fff',
      }}
    >
      {children}
    </button>
  );
}
