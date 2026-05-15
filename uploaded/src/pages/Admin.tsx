import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, orderBy, limit, getDoc, updateDoc, setDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, MessageSquare, Trash2, Globe, ShieldAlert, ChevronRight, Activity, Ban, MapPin, X, Radio } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import CustomDialog, { DialogType } from '../components/CustomDialog';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'security'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Security Form State
  const [countryCode, setCountryCode] = useState('');

  // Dialog State
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: DialogType;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showDialog = (title: string, message: string, type: DialogType = 'info', onConfirm?: () => void) => {
    setDialog({ isOpen: true, title, message, type, onConfirm });
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch Users + Security Data
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      const usersList: any[] = [];
      
      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        let securityData = {};
        try {
          // Fetch from private/security specifically
          const secDoc = await getDoc(doc(db, 'users', uDoc.id, 'private', 'security'));
          if (secDoc.exists()) securityData = secDoc.data();
        } catch (e) { 
            console.warn(`Could not access security data for ${uDoc.id}`);
        }
        
        usersList.push({ id: uDoc.id, ...uData, ...securityData });
      }
      setUsers(usersList);

      // Fetch Support messages (reports)
      const supportSnap = await getDocs(query(collection(db, 'support_messages'), orderBy('createdAt', 'desc'), limit(50)));
      setReports(supportSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Blocked Countries
      const countrySnap = await getDocs(collection(db, 'blocked_countries'));
      setBlockedCountries(countrySnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.role !== 'owner' && profile.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAdminData();
  }, [profile, navigate]);

  const handleBanUser = async (targetId: string, name: string, currentlyBanned: boolean) => {
    showDialog(
      currentlyBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${currentlyBanned ? 'unban' : 'ban'} ${name}?`,
      'confirm',
      async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await updateDoc(doc(db, 'users', targetId), { banned: !currentlyBanned });
          await fetchAdminData();
          showDialog('Success', `User ${currentlyBanned ? 'unbanned' : 'banned'} successfully.`, 'info');
        } catch (e) {
          showDialog('Error', 'Operation failed', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleBlockIP = async (ip: string) => {
    if (!ip || ip === '?.?.?.?') return;
    showDialog(
      'Block IP',
      `Are you sure you want to blacklist IP ${ip}?`,
      'confirm',
      async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await setDoc(doc(db, 'blocked_ips', ip.replace(/\./g, '_')), { ip, createdAt: new Date().toISOString() });
          showDialog('Success', `IP ${ip} has been blacklisted.`, 'info');
        } catch (e) {
          showDialog('Error', 'Operation failed', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleAddBlockedCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryCode) return;
    setLoading(true);
    try {
      const code = countryCode.toUpperCase().trim();
      await setDoc(doc(db, 'blocked_countries', code), { code, createdAt: new Date().toISOString() });
      setCountryCode('');
      await fetchAdminData();
      showDialog('Success', `Country ${code} blocked.`, 'info');
    } catch (e) {
      showDialog('Error', 'Failed to block country', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBlockedCountry = async (id: string, code: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'blocked_countries', id));
      await fetchAdminData();
      showDialog('Success', `Country ${code} unblocked.`, 'info');
    } catch (e) {
      showDialog('Error', 'Failed to unblock country', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processing Tactical Data...</span>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-6 max-w-7xl mx-auto">
      <CustomDialog 
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        isOpen={dialog.isOpen}
      />

      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Command Center</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Operational Oversight: {profile?.role || 'Admin'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Nav */}
        <div className="space-y-3">
           <button 
            onClick={() => setActiveTab('users')}
            className={cn(
               "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]",
               activeTab === 'users' ? "bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800"
            )}
           >
             <div className="flex items-center gap-4"><Users size={16} /> User Nodes</div>
             {activeTab === 'users' && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
           </button>
           <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
               "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]",
               activeTab === 'reports' ? "bg-rose-600 text-white shadow-xl" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800"
            )}
           >
             <div className="flex items-center gap-4"><ShieldAlert size={16} /> Threats</div>
             {reports.length > 0 && <div className="px-2 py-0.5 rounded-lg bg-white/20 text-[8px]">{reports.length}</div>}
           </button>
           <button 
            onClick={() => setActiveTab('security')}
            className={cn(
               "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]",
               activeTab === 'security' ? "bg-cyan-600 text-white shadow-xl" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800"
            )}
           >
             <div className="flex items-center gap-4"><Globe size={16} /> Geofencing</div>
           </button>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {users.map(u => (
                  <div key={u.id} className={cn(
                    "bg-white dark:bg-slate-900 border p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 group transition-all",
                    u.banned ? "border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10 opacity-75" : "border-slate-100 dark:border-slate-800 hover:border-cyan-500/30"
                  )}>
                     <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-md">
                            <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                          </div>
                          {u.banned && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
                              <Ban size={12} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                            {u.displayName}
                            {u.role === 'owner' && <Shield size={14} className="text-cyan-500" />}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest ring-1 ring-cyan-500/20">
                              {u.role}
                            </span>
                            <span className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                              <Globe size={10} className={u.countryCode ? "text-cyan-500" : "text-slate-300"} /> 
                              {u.countryCode || '??'}
                            </span>
                            <span className="flex items-center gap-2 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                              <Radio size={10} className={u.lastIP ? "text-emerald-500" : "text-slate-300"} /> 
                              {u.lastIP || 'No Signal Detected'}
                            </span>
                          </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        {u.lastIP && (
                          <button 
                            onClick={() => handleBlockIP(u.lastIP)}
                            title="Block IP"
                            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 border border-slate-700 dark:border-slate-800 text-[9px] font-black uppercase text-white hover:bg-rose-600 rounded-xl transition-all shadow-lg"
                          >
                            Block IP
                          </button>
                        )}
                        {u.role !== 'owner' && (
                          <button 
                            onClick={() => handleBanUser(u.id, u.displayName, !!u.banned)}
                            className={cn(
                              "px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all border",
                              u.banned 
                                ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" 
                                : "bg-white dark:bg-slate-950 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white"
                            )}
                          >
                            {u.banned ? 'Restore Access' : 'Terminate User'}
                          </button>
                        )}
                        <button onClick={() => navigate(`/user/${u.id}`)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-cyan-500 rounded-xl transition-all">
                          <ChevronRight size={20} />
                        </button>
                     </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
                {reports.length > 0 ? reports.map(r => (
                  <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
                            <MessageSquare size={22} />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] block mb-1">Incoming Transmission</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{formatDate(r.createdAt)}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteDoc(doc(db, 'support_messages', r.id)).then(() => fetchAdminData())}
                          className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                        >
                          Decommission Signal
                        </button>
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic border-l-4 border-rose-500 pl-6 leading-relaxed">
                          "{r.text}"
                        </p>
                     </div>
                  </div>
                )) : (
                  <div className="py-24 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                    <Activity size={48} className="mx-auto mb-6 text-slate-200 dark:text-slate-800" />
                    <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">Zero Threats Detected</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Globe size={120} />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Global Access Protocols</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest max-w-md">Define active containment zones. Geofencing blocks specific nodes from accessing the network.</p>
                    
                    <form onSubmit={handleAddBlockedCountry} className="mt-8 flex gap-3 max-w-sm">
                      <input 
                        type="text" 
                        placeholder="ISO CODE (e.g. US)" 
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 outline-none focus:border-cyan-500 transition-all font-black uppercase tracking-widest text-xs"
                      />
                      <button className="px-8 bg-cyan-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-cyan-400 active:scale-95 transition-all">
                        Restrict
                      </button>
                    </form>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blockedCountries.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900">
                           <MapPin size={18} />
                         </div>
                         <span className="font-black text-slate-900 dark:text-white uppercase italic text-lg">{c.code}</span>
                       </div>
                       <button 
                        onClick={() => handleRemoveBlockedCountry(c.id, c.code)}
                        className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                       >
                         <X size={18} />
                       </button>
                    </div>
                  ))}
                  {blockedCountries.length === 0 && (
                     <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active geofences deployed</p>
                     </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Admin;
