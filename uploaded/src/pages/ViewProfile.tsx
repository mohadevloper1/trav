import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Calendar, Star, ArrowLeft, Shield, Award, MessageCircle, Briefcase, TrendingUp, CheckCircle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getPlayerRank } from '../constants';
import TradeCard from '../components/TradeCard';
import CustomDialog, { DialogType } from '../components/CustomDialog';

const ViewProfile = () => {
  const { userId } = useParams();
  const { user: currentUser, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [newRating, setNewRating] = useState({ score: 5, comment: '' });

  const isAdmin = currentUserProfile?.role === 'owner' || currentUserProfile?.role === 'admin';

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

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Fetch User Profile
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        // Fetch User Trades
        const tradesQuery = query(
          collection(db, 'trades'),
          where('authorId', '==', userId),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );
        const tradesSnap = await getDocs(tradesQuery);
        setTrades(tradesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Ratings
        const ratingsQuery = query(
          collection(db, 'ratings'),
          where('targetId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const ratingsSnap = await getDocs(ratingsQuery);
        setRatings(ratingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleLeaveRating = async () => {
    if (currentUser.uid === userId) {
      showDialog('Error', 'You cannot rate your own profile.', 'error');
      return;
    }

    setRatingLoading(true);
    try {
      try {
        await addDoc(collection(db, 'ratings'), {
          targetId: userId,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || 'Anonymous',
          score: newRating.score,
          comment: newRating.comment,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        return handleFirestoreError(err, OperationType.CREATE, 'ratings');
      }

      // Update user reputation
      const totalRatings = ratings.length + 1;
      const totalScore = ratings.reduce((acc, r) => acc + r.score, 0) + newRating.score;
      const avgScore = totalScore / totalRatings;
      
      const level = avgScore >= 4.5 ? 'Elite Trader' : avgScore >= 3.5 ? 'Trusted Trader' : 'Verified Merchant';

      try {
        await updateDoc(doc(db, 'users', userId), {
          reputation: avgScore,
          level: level
        });
      } catch (err) {
        return handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }

      setShowRatingModal(false);
      showDialog('Thank You!', 'Your rating has been successfully posted.', 'success', () => {
        navigate(0);
      });
    } catch (err: any) {
      console.error("Rating error:", err);
      let errorMsg = 'Failed to post rating.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) errorMsg = `${errorMsg} (${parsed.operationType}: ${parsed.error})`;
      } catch (e) {
        if (err.message) errorMsg = `${errorMsg} ${err.message}`;
      }
      showDialog('Permission Error', errorMsg, 'error');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUser || !userId) return;
    if (currentUser.uid === userId) return;

    try {
      const convsRef = collection(db, 'conversations');
      const q = query(convsRef, where('participants', 'array-contains', currentUser.uid));
      const snap = await getDocs(q);
      
      const existing = snap.docs.find(doc => doc.data().participants.includes(userId));
      
      if (existing) {
        navigate(`/messages/${existing.id}`);
      } else {
        const newConv = await addDoc(convsRef, {
          participants: [currentUser.uid, userId],
          updatedAt: serverTimestamp(),
          lastMessage: 'Conversation started',
          lastSenderId: currentUser.uid,
          unreadCount: {
            [userId]: 1
          }
        });
        navigate(`/messages/${newConv.id}`);
      }
    } catch (err) {
      console.error("Chat init error:", err);
    }
  };

  const handleAdminDelete = async () => {
    if (!currentUser || profile.role === 'owner') return;
    
    showDialog(
      '⚠️ DELETE ACCOUNT',
      `Are you sure you want to PERMANENTLY delete ${profile.displayName}'s account?`,
      'confirm',
      async () => {
        setLoading(true);
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const tradesQuery = query(collection(db, 'trades'), where('authorId', '==', userId));
          const tradesSnap = await getDocs(tradesQuery);
          for (const t of tradesSnap.docs) await deleteDoc(doc(db, 'trades', t.id));

          const supportQuery = query(collection(db, 'support_messages'), where('threadId', '==', userId));
          const supportSnap = await getDocs(supportQuery);
          for (const m of supportSnap.docs) await deleteDoc(doc(db, 'support_messages', m.id));

          const ratingsAuthorQuery = query(collection(db, 'ratings'), where('authorId', '==', userId));
          const ratingsTargetQuery = query(collection(db, 'ratings'), where('targetId', '==', userId));
          const [authSnap, targetSnap] = await Promise.all([getDocs(ratingsAuthorQuery), getDocs(ratingsTargetQuery)]);
          for (const r of authSnap.docs) await deleteDoc(doc(db, 'ratings', r.id));
          for (const r of targetSnap.docs) await deleteDoc(doc(db, 'ratings', r.id));

          const convQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
          const convSnap = await getDocs(convQuery);
          for (const convDoc of convSnap.docs) {
            const msgsSnap = await getDocs(collection(db, 'conversations', convDoc.id, 'messages'));
            for (const m of msgsSnap.docs) await deleteDoc(doc(db, 'conversations', convDoc.id, 'messages', m.id));
            await deleteDoc(doc(db, 'conversations', convDoc.id));
          }

          try { await deleteDoc(doc(db, 'users', userId!, 'private', 'security')); } catch (e) {}
          await deleteDoc(doc(db, 'users', userId!));

          showDialog('Account Deleted', 'User account has been removed.', 'success', () => {
            navigate('/');
          });
        } catch (err: any) {
          console.error('Delete failed:', err);
          showDialog('Error', `Deletion failed: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">User not found</h2>
        <button onClick={() => navigate('/')} className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Back to Marketplace</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-6 max-w-7xl mx-auto">
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      
      <div className="mb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Back</span>
        </button>

        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-16 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
           
           <div className="flex flex-col md:flex-row gap-16 items-center md:items-start relative z-10">
             <div className="relative shrink-0">
               <div className={cn(
                 "w-56 h-56 rounded-[3.5rem] bg-slate-50 dark:bg-slate-950 border-8 shadow-2xl overflow-hidden ring-8",
                 profile.role === 'owner' 
                   ? "border-cyan-500 ring-cyan-500/5" 
                   : "border-white dark:border-slate-900 ring-slate-100 dark:ring-slate-800"
               )}>
                 <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
               </div>
               {profile.role === 'owner' && (
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-8 py-2 bg-slate-900 text-white rounded-full border-2 border-cyan-500 shadow-xl">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">System Admin</span>
                 </div>
               )}
             </div>

             <div className="flex-1 space-y-10 text-center md:text-left">
               <div>
                  <div className="flex flex-col md:flex-row md:items-center gap-6 mb-4">
                    <h1 className="text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                      {profile.displayName}
                    </h1>
                    <div className="flex items-center gap-3">
                       {profile.verified && <CheckCircle size={28} className="text-cyan-500" />}
                       {isAdmin && currentUser?.uid !== userId && profile.role !== 'owner' && (
                          <button 
                            onClick={handleAdminDelete}
                            className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 shadow-sm"
                            title="TERMINATE NODE"
                          >
                            <Trash2 size={24} />
                          </button>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                     <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                       {profile.countryCode ? (
                          <img 
                            src={`https://flagcdn.com/w24/${profile.countryCode.toLowerCase()}.png`} 
                            alt="" 
                            className="w-8 h-6 object-contain"
                          />
                        ) : (
                          <MapPin size={18} className="text-cyan-500" />
                        )}
                       <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">
                         {profile.country || profile.location || 'Global Operations'}
                       </span>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                       <Shield size={18} className="text-slate-400 font-bold" />
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest italic">{profile.level || 'Merchant Node'}</span>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-6">
                    <Mail size={20} className="text-slate-400" />
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Communication</div>
                      <div className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{profile.email || 'Encrypted Channel'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <a 
                      href={profile.facebookPage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-3xl border transition-all",
                        profile.facebookPage ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 text-blue-600" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-30 pointer-events-none"
                      )}
                    >
                      <User size={20} className="mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Page</span>
                    </a>
                    <a 
                      href={profile.facebookGroup} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-3xl border transition-all",
                        profile.facebookGroup ? "bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-600" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-30 pointer-events-none"
                      )}
                    >
                      <Users size={20} className="mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Group</span>
                    </a>
                  </div>
               </div>

               <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                  {currentUser && currentUser.uid !== userId && (
                    <button 
                      onClick={handleStartChat}
                      className="px-16 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[3rem] text-xs font-black uppercase tracking-[0.4em] shadow-2xl hover:-translate-y-2 transition-all flex items-center gap-6 active:scale-95"
                    >
                      <MessageCircle size={24} />
                      Establish Contact
                    </button>
                  )}
                  <div className="px-10 py-6 bg-amber-500/10 border border-amber-500/20 rounded-[3rem] text-amber-600 flex items-center gap-4">
                    <Star size={24} className="fill-amber-500" />
                    <div>
                      <div className="text-2xl font-black italic tracking-tighter leading-none">{(profile.reputation || 0).toFixed(1)}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest">Global Status</div>
                    </div>
                  </div>
               </div>
             </div>
           </div>
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start justify-center mt-12">
      <div className="lg:col-span-3 space-y-10">
        {/* Latest Offers Section */}
        <div>
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-600">
                <Briefcase size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Published Signals</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {trades.length > 0 ? (
              trades.map(trade => (
                <TradeCard key={trade.id} trade={trade} />
              ))
            ) : (
              <div className="col-span-full p-20 border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-[3rem] text-center flex flex-col items-center justify-center opacity-40">
                <Briefcase size={40} className="text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No active signals detected from this node</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div>
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                <Award size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Reputation Log</h2>
            </div>
            {currentUser && currentUser.uid !== userId && (
              <button 
                onClick={() => setShowRatingModal(true)}
                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
              >
                <Star size={16} /> Rate Node
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ratings.length > 0 ? (
              ratings.map(rating => (
                <motion.div 
                  key={rating.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <User size={16} />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{rating.authorName}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} className={cn(i < rating.score ? "text-yellow-400 fill-yellow-400" : "text-slate-100 dark:text-slate-800")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic border-l-2 border-slate-100 dark:border-slate-800 pl-4">"{rating.comment}"</p>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full p-20 border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-3xl text-center flex flex-col items-center justify-center opacity-40">
                <Star size={32} className="text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No rating signals detected on this node</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowRatingModal(false)}
               className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
             />
               <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl"
             >
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter mb-2">Rate {profile.displayName}</h3>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">Share your trading experience with this merchant.</p>

               <div className="space-y-6">
                 <div className="flex flex-col items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Score</span>
                    <div className="flex items-center gap-3">
                       {[1, 2, 3, 4, 5].map(star => (
                         <button 
                          key={star} 
                          onClick={() => setNewRating({ ...newRating, score: star })}
                          className="transition-transform active:scale-90"
                         >
                           <Star size={32} className={cn(star <= newRating.score ? "text-yellow-400 fill-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]" : "text-slate-200 dark:text-slate-800")} />
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                   <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Feedback</span>
                   <textarea 
                    value={newRating.comment}
                    onChange={e => setNewRating({ ...newRating, comment: e.target.value })}
                    placeholder="Describe your trade experience..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-cyan-500/30 min-h-[100px] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-800"
                   />
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button 
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    onClick={handleLeaveRating}
                    disabled={ratingLoading || !newRating.comment.trim()}
                    className="flex-1 py-3 bg-linear-to-r from-cyan-400 to-indigo-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                    {ratingLoading ? 'Submitting...' : 'Post Review'}
                   </button>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
</>
);
};

export default ViewProfile;
