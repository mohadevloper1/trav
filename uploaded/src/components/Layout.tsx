import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { DEVELOPER_SIGNALS } from '../constants';
import { Shield, Facebook, Info, Activity, Users } from 'lucide-react';

const Layout = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto overflow-x-hidden flex flex-col">
      <Navbar />
      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
      
      {/* Decorative background elements */}
      <div className="fixed top-0 right-0 -z-10 w-full h-full bg-slate-50 dark:bg-slate-950 pointer-events-none" />
      <div className="fixed top-0 right-0 -z-10 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

export default Layout;
