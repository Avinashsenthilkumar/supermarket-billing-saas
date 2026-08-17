// src/components/shared/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1 min-w-0 overflow-y-auto">
      <Outlet />
    </main>
  </div>
);

export default Layout;
