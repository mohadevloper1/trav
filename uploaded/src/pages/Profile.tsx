import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, MapPin, AlignLeft, Save, X, CheckCircle, Trash2, Tag, ArrowLeftRight, Paperclip, Shield, LogOut, UserX, Star, Award, AlertTriangle, Briefcase, ShieldAlert, Globe } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { getPlayerRank } from '../constants';
import { Link } from 'react-router-dom';
import CustomDialog, { DialogType } from '../components/CustomDialog';

const Profile = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [ratingsCount, setRatingsCount] = useState(0);

  useEffect(() => {
    const fetchRatingsCount = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'ratings'), where('targetId', '==', user.uid));
        const snap = await getDocs(q);
        setRatingsCount(snap.size);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRatingsCount();
  }, [user]);

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

  const [myTrades, setMyTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);

  const fetchMyTrades = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'trades'),
        where('authorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setMyTrades(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setTradesLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTrades();
  }, [user]);

  const handleDeleteTrade = async (tradeId: string) => {
    showDialog(
      'Confirm Deletion', 
      'Are you sure you want to delete this offer?', 
      'confirm',
      async () => {
        try {
          await deleteDoc(doc(db, 'trades', tradeId));
          setMyTrades(prev => prev.filter(t => t.id !== tradeId));
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    showDialog(
      '⚠️ ATTENTION: PERMANENT ACTION',
      'Are you sure you want to delete your account? This will permanently erase your profile, all your trades, and support history. You MUST have logged in recently for this to succeed.',
      'confirm',
      async () => {
        setLoading(true);
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          // 1. Delete trades first while we still have permissions as 'owner'
          const tradesQuery = query(collection(db, 'trades'), where('authorId', '==', user.uid));
          const tradesSnap = await getDocs(tradesQuery);
          const tradesPromises = tradesSnap.docs.map(t => deleteDoc(doc(db, 'trades', t.id)));
          await Promise.all(tradesPromises);

          // 2. Delete support messages related to user
          const supportQuery = query(collection(db, 'support_messages'), where('threadId', '==', user.uid));
          const supportSnap = await getDocs(supportQuery);
          const supportPromises = supportSnap.docs.map(m => deleteDoc(doc(db, 'support_messages', m.id)));
          await Promise.all(supportPromises);

          // 3. Delete ratings related to user (as author or target)
          const ratingsAuthorQuery = query(collection(db, 'ratings'), where('authorId', '==', user.uid));
          const ratingsTargetQuery = query(collection(db, 'ratings'), where('targetId', '==', user.uid));
          
          const [authSnap, targetSnap] = await Promise.all([
            getDocs(ratingsAuthorQuery),
            getDocs(ratingsTargetQuery)
          ]);
          
          // Use a set to avoid double-deleting IDs
          const uniqueRatingIds = new Set([...authSnap.docs.map(d => d.id), ...targetSnap.docs.map(d => d.id)]);
          const ratingPromises = Array.from(uniqueRatingIds).map(id => deleteDoc(doc(db, 'ratings', id)));
          await Promise.all(ratingPromises);

          // 4. Delete conversations and messages
          const convQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
          const convSnap = await getDocs(convQuery);
          
          for (const convDoc of convSnap.docs) {
            const msgsSnap = await getDocs(collection(db, 'conversations', convDoc.id, 'messages'));
            const msgPromises = msgsSnap.docs.map(m => deleteDoc(doc(db, 'conversations', convDoc.id, 'messages', m.id)));
            await Promise.all(msgPromises);
            await deleteDoc(doc(db, 'conversations', convDoc.id));
          }

          // 5. Delete private subcollection documents
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'private', 'security'));
          } catch (e) { console.warn("No private security doc found or failed to delete"); }

          // 6. Delete user doc
          await deleteDoc(doc(db, 'users', user.uid));

          // 7. Delete from Firebase Auth
          try {
            await deleteUser(user);
            showDialog('Protocol Complete', 'Your account and all associated data has been purged from the system.', 'success', () => {
              window.location.href = '/';
            });
          } catch (authErr: any) {
            console.warn('Auth delete failed:', authErr);
            if (authErr.code === 'auth/requires-recent-login') {
              showDialog(
                'Security Shield Active', 
                'For security reasons, you must re-authenticate before deleting your account. Please log out, log back in, and immediately initiate deletion.', 
                'warning',
                async () => {
                   await auth.signOut();
                   window.location.href = '/login';
                }
              );
            } else {
              // If we already deleted the DB data but Auth failed for some other reason, 
              // at least they are "deleted" from the app perspective.
              await auth.signOut();
              showDialog('Purge Status', 'Your database records were erased, but your authentication session persists. You have been logged out manually.', 'warning', () => {
                window.location.href = '/';
              });
            }
          }
        } catch (err: any) {
          console.error('Purge failed:', err);
          showDialog('Terminal Error', `The deletion sequence failed: ${err.message || 'Access Denied'}. Please contact support if this persists.`, 'error');
        } finally {
          setLoading(false);
          fetchMyTrades(); // Refresh just in case
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 md:px-0">
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      
      {/* Profile Dashboard Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-cyan-500 to-indigo-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-16 rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
          
          <div className="flex flex-col items-center text-center space-y-12">
            {/* Avatar Section */}
            <div className="relative">
              <div className="w-48 h-48 rounded-[3rem] bg-slate-50 dark:bg-slate-950 border-8 border-white dark:border-slate-800 shadow-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={profile?.photoURL}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl border border-slate-700 dark:border-slate-200">
                Active Node
              </div>
            </div>

            {/* Main Stats Row */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-500">
                  <Award size={24} />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{profile?.level || 'Starter'}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Level</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                  <Star size={24} className="fill-amber-500/20" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{(profile?.reputation || 0).toFixed(1)}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ratingsCount} Global Reviews</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                  <CheckCircle size={24} />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{profile?.completedTrades || 0}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Successful Signals</div>
              </div>
            </div>

            {/* Core Info Display */}
            <div className="w-full max-w-2xl space-y-4">
              <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <div className="flex items-center gap-6">
                  <User size={20} className="text-cyan-500" />
                  <div className="text-left">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Handle</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter">{profile?.displayName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <Globe size={18} />
                  <span className="text-sm font-bold uppercase tracking-widest">{profile?.countryCode || 'GL'}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <Mail size={20} className="text-slate-400" />
                <div className="text-left">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Communication Uplink</div>
                  <div className="text-sm font-bold text-slate-600 dark:text-slate-400">{user?.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                  href={profile?.facebookPage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-6 p-6 border rounded-[2rem] transition-all group/link",
                    profile?.facebookPage ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover/link:scale-110 transition-transform">
                    <Tag size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facebook Page</div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
                      {profile?.facebookPage ? 'Active Link' : 'Not Connected'}
                    </div>
                  </div>
                </a>

                <a 
                  href={profile?.facebookGroup} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-6 p-6 border rounded-[2rem] transition-all group/link",
                    profile?.facebookGroup ? "bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg group-hover/link:scale-110 transition-transform">
                    <Users size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facebook Group</div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                      {profile?.facebookGroup ? 'Active Link' : 'Not Connected'}
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* Logout Action */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 w-full flex justify-center">
              <button 
                onClick={handleLogout}
                className="px-12 py-5 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 rounded-[2rem] hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-4"
              >
                <LogOut size={16} /> Deactivate Signal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 flex justify-center">
        <button 
          onClick={handleDeleteAccount}
          className="px-8 py-3 bg-rose-500/5 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Purge Identity Node
        </button>
      </div>
    </div>
  );
};

export default Profile;
