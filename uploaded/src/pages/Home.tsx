import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import TradeCard from '../components/TradeCard';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, TrendingUp, Plus, X, Image as ImageIcon, PlusCircle, AlertCircle, Shield, User, MessageCircle, Star, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEVELOPER_SIGNALS } from '../constants';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  // Create offer state
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    haveItem: '',
    wantItem: '',
    imageUrl: ''
  });

  const [value, loading, error] = useCollection(
    query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(50))
  );

  const trades = value?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setFormLoading(true);
    setFormError('');

    try {
      const haveItem = formData.haveItem.trim();
      const wantItem = formData.wantItem.trim();
      const title = formData.title.trim();
      const description = formData.description.trim();

      if (!haveItem || !wantItem || !title || !description) {
        setFormError('Please fill all required fields.');
        setFormLoading(false);
        return;
      }

      const newTrade = {
        title,
        description,
        haveItem,
        wantItem,
        imageUrl: formData.imageUrl || '',
        authorId: user.uid,
        authorName: profile?.displayName || 'Player',
        status: 'active',
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'trades'), newTrade);
      
      setFormData({
        title: '',
        description: '',
        haveItem: '',
        wantItem: '',
        imageUrl: ''
      });
      
      // Close modal and reset state
      setShowForm(false);
      setFormError('');
      
    } catch (err) {
      console.error('Error creating trade:', err);
      setFormError('An error occurred while posting. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Section */}
      <section className="relative h-[240px] md:h-[300px] mb-8 rounded-[3rem] overflow-hidden flex flex-col items-center justify-center text-center p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl group text-slate-900 dark:text-white">
        <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-indigo-600/5 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white uppercase italic leading-none">
            NEON<span className="text-cyan-500">BAZAAR</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.2em] max-w-lg mx-auto opacity-60">
            Nexus for elite card collectors and signal traders.
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-4">
            <button 
              onClick={() => setShowForm(!showForm)}
              className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95"
            >
              {showForm ? <X size={20} /> : <PlusCircle size={20} />}
              {showForm ? 'Abort Signal' : 'Broadcast Signal'}
            </button>
          </div>
        </motion.div>
      </section>

      {/* Collapsible Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl mb-12 shadow-2xl dark:backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 uppercase italic">
                  <PlusCircle className="text-cyan-600 dark:text-cyan-500" />
                  Create Trade Offer
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div className="bg-red-500/5 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                  <AlertCircle size={20} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTrade} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Card You Have</label>
                    <input 
                      type="text"
                      required
                      value={formData.haveItem}
                      onChange={(e) => setFormData({ ...formData, haveItem: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 outline-none transition-all text-slate-900 dark:text-slate-200 text-sm font-bold"
                      placeholder="e.g. Phoenix Card"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Card You Want</label>
                    <input 
                      type="text"
                      required
                      value={formData.wantItem}
                      onChange={(e) => setFormData({ ...formData, wantItem: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 outline-none transition-all text-slate-900 dark:text-slate-200 text-sm font-bold"
                      placeholder="e.g. Golden Dragon"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Offer Title</label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 outline-none transition-all text-slate-900 dark:text-slate-200 text-sm font-bold"
                    placeholder="Short summary (e.g. Fast swap for dragon)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Description</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 outline-none transition-all resize-none text-slate-900 dark:text-slate-200 text-sm font-bold"
                    placeholder="Add details..."
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="px-8 py-3 bg-linear-to-r from-cyan-600 to-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-cyan-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {formLoading ? 'Posting...' : 'Confirm and Post'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h2 className="text-2xl font-bold uppercase text-slate-900 dark:text-white">Active Offers</h2>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search cards..."
              className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm dark:shadow-none"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-[300px] bg-white dark:bg-slate-900/50 rounded-3xl animate-pulse border border-slate-200 dark:border-slate-800" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-red-500/5 border border-red-500/10 rounded-3xl p-8">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
              <p className="text-red-500 uppercase font-black tracking-widest text-xs mb-2">Sync Error</p>
              <p className="text-slate-500 text-[10px] font-mono leading-relaxed max-w-md mx-auto">
                {error.message}
                {error.message.includes('index') && (
                  <span className="block mt-2 text-cyan-500 font-bold">Note: A Firestore Index might be required for the current query filters.</span>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {trades.length > 0 ? (
                trades.map((trade: any, index: number) => (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TradeCard trade={trade} />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <p className="text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest text-xs">No active offers. Be the first to post!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-96 space-y-8">
          <AdminCard />
          
          <div className="bg-linear-to-br from-cyan-500/5 to-indigo-600/5 border border-cyan-500/10 rounded-[2.5rem] p-8 shadow-xl">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-500 mb-4 italic">Security Protocol</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
              Any attempt at manipulation or non-compliant behavior results in <span className="text-rose-500">Immediate Node Termination</span>. 
              Maintain operational integrity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminCard = () => {
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'owner'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdmin({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error("Error fetching featured account:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, []);

  if (loading) return <div className="h-64 bg-slate-900/10 dark:bg-white/5 rounded-[3rem] animate-pulse border border-slate-200 dark:border-slate-800" />;
  if (!admin) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group"
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent to-indigo-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      
      {/* Large background icon */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000 group-hover:opacity-10">
        <Shield size={160} className="text-cyan-400" />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-5">
           <div className="relative">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-800 border-2 border-cyan-500/40 overflow-hidden shadow-2xl ring-4 ring-cyan-500/10 group-hover:border-cyan-400 transition-colors">
                {admin.photoURL ? (
                  <img src={admin.photoURL} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <User size={40} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-slate-900">
                <CheckCircle size={14} className="text-white" />
              </div>
           </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-black text-white uppercase tracking-tighter italic">{admin.displayName}</span>
            </div>
            <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-xl inline-flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] leading-none italic">Root Authority</span>
            </div>
          </div>
        </div>

        <p className="text-[12px] text-slate-400 font-medium leading-relaxed italic border-l-2 border-cyan-500/30 pl-4 py-1">
          {admin.bio || "Core developer and security auditor for NEON BAZAAR."}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 text-center">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Reputation</span>
             <span className="text-xl font-black text-white italic">{(admin.reputation || 5.0).toFixed(1)}</span>
          </div>
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 text-center">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status</span>
             <span className="text-[10px] font-black text-emerald-400 uppercase italic">Encrypted</span>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <Link 
            to={`/user/${admin.id}`}
            className="w-full block py-5 bg-white text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] text-center shadow-xl hover:bg-cyan-400 hover:text-white hover:translate-y-[-4px] transition-all active:scale-95 duration-300"
          >
            Access Profile
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={DEVELOPER_SIGNALS.facebookPage}
              target="_blank"
              rel="noreferrer"
              className="py-4 bg-slate-800/50 text-slate-300 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              Signal Core
            </a>
            <a
              href={DEVELOPER_SIGNALS.facebookGroup} 
              target="_blank"
              rel="noreferrer"
              className="py-4 bg-slate-800/50 text-slate-300 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-cyan-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              Signal Hub
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Home;
