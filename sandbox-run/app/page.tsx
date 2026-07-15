"use client";
import React from 'react';
import { Dashboard } from '../components/Dashboard';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#11111B', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Dashboard />
    </main>
  );
}
