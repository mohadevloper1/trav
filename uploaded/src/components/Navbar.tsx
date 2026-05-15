import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '../lib/firebase';
import { LogOut, User, MessageSquare, Home as HomeIcon, Users, Briefcase, Tag, Sun, Moon, HelpCircle, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const { user, profile, unreadTotal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Real-time stats
  const [usersSnap] = useCollection(collection(db, 'users'));
  const [tradesSnap] = useCollection(collection(db, 'trades'));

  const userCount = usersSnap?.size || 0;
  const tradeCount = tradesSnap?.size || 0;

  const [ownerId, setOwnerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchOwner = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'owner'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setOwnerId(snap.docs[0].id);
      }
    };
    fetchOwner();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <>
      {/* Top Navbar (Desktop + Logo) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-4 px-4 md:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-linear-to-br from-cyan-400 to-indigo-600 flex items-center justify-center p-0.5 shadow-lg group-hover:rotate-6 transition-transform">
             <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Tag className="text-cyan-400 group-hover:scale-110 transition-all w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
             </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm md:text-lg font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">NEON</span>
            <span className="text-[8px] md:text-[10px] font-black text-cyan-600 dark:text-cyan-500 tracking-[0.3em]">BAZAAR</span>
          </div>
        </Link>

        {/* Mobile Stats (Always visible now) */}
        <div className="flex items-center gap-2 md:gap-4 px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 mx-2 md:hidden">
          <div className="flex items-center gap-1">
            <Users size={12} className="text-cyan-500" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums">{userCount}</span>
          </div>
          <div className="w-px h-3 bg-slate-200 dark:bg-white/10" />
          <div className="flex items-center gap-1">
            <Briefcase size={12} className="text-indigo-500" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums">{tradeCount}</span>
          </div>
        </div>

        {/* Stats Dashboard (Desktop) */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 px-4 lg:px-6 py-2 rounded-2xl bg-slate-50/80 dark:bg-black/40 border border-slate-200 dark:border-slate-800 shadow-[inset_0_1px_20px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 lg:gap-3 group cursor-default">
            <div className="p-1.5 lg:p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Users size={14} className="lg:hidden" />
              <Users size={16} className="hidden lg:block" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] lg:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5 lg:mb-1">Users</span>
              <span className="text-xs lg:text-sm font-black text-slate-900 dark:text-white tabular-nums glow-text">{userCount}</span>
            </div>
          </div>
          
          <div className="w-px h-6 lg:h-8 bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2 lg:gap-3 group cursor-default">
            <div className="p-1.5 lg:p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <Briefcase size={14} className="lg:hidden" />
              <Briefcase size={16} className="hidden lg:block" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] lg:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5 lg:mb-1">Trades</span>
              <span className="text-xs lg:text-sm font-black text-slate-900 dark:text-white tabular-nums glow-text">{tradeCount}</span>
            </div>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 bg-slate-100/50 dark:bg-slate-800/30 px-6 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <NavLink to="/" icon={<HomeIcon size={20} />} label="Marketplace" active={isActive('/')} />
          <NavLink to="/messages" icon={<MessageSquare size={20} />} label="Messages" active={isActive('/messages')} badge={unreadTotal} />
          <NavLink to="/profile" icon={<User size={20} />} label="Profile" active={isActive('/profile')} />
          <NavLink to="/support" icon={<HelpCircle size={20} />} label="Support" active={isActive('/support')} />
          {(profile?.role === 'owner' || profile?.role === 'admin') && (
            <NavLink to="/admin" icon={<Shield size={20} />} label="Terminal" active={isActive('/admin')} />
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <User size={16} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden lg:inline">{profile?.displayName || 'My Profile'}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-600 dark:text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 hover:border-red-500/20 transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/20 text-sm"
            >
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-3xl flex items-center justify-between shadow-2xl shadow-black/10 dark:shadow-black/50">
          <MobileNavLink to="/" icon={<HomeIcon size={24} />} active={isActive('/')} />
          <MobileNavLink to="/messages" icon={<MessageSquare size={24} />} active={isActive('/messages')} badge={unreadTotal} />
          <MobileNavLink to="/profile" icon={<User size={24} />} active={isActive('/profile')} />
          <MobileNavLink to="/support" icon={<HelpCircle size={24} />} active={isActive('/support')} />
          {(profile?.role === 'owner' || profile?.role === 'admin') && (
            <MobileNavLink to="/admin" icon={<Shield size={24} />} active={isActive('/admin')} />
          )}
        </div>
      </div>
    </>
  );
};

const NavLink = ({ to, icon, label, active, badge }: { to: string, icon: React.ReactNode, label: string, active: boolean, badge?: number }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-2 transition-all relative ${active ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
  >
    {icon}
    <span className="font-bold text-sm">{label}</span>
    {badge && badge > 0 && (
      <div className="absolute -top-1 -right-4 min-w-[14px] h-[14px] bg-red-500 text-[8px] text-white rounded-full flex items-center justify-center border border-slate-950 font-black">
        {badge}
      </div>
    )}
    {active && (
      <motion.div 
        layoutId="nav-active"
        className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
      />
    )}
  </Link>
);

const MobileNavLink = ({ to, icon, active, badge }: { to: string, icon: React.ReactNode, active: boolean, badge?: number }) => (
  <Link 
    to={to} 
    className={`transition-all relative ${active ? 'text-cyan-400 scale-110' : 'text-slate-500'}`}
  >
    {icon}
    {badge && badge > 0 && (
      <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-[8px] text-white rounded-full flex items-center justify-center border border-slate-950 font-black">
        {badge}
      </div>
    )}
    {active && (
      <motion.div 
        layoutId="mobile-nav-active"
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
      />
    )}
  </Link>
);

export default Navbar;
