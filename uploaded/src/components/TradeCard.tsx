import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeftRight, MessageCircle, MessageSquare, User as UserIcon, Calendar, Heart, Trash2, CheckCircle, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, deleteDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

import { db } from '../lib/firebase';
import CustomDialog, { DialogType } from './CustomDialog';

interface TradeCardProps {
  trade: any;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authorProfile, setAuthorProfile] = useState<any>(undefined); // undefined means loading, null means deleted
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);

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
    if (trade.authorId) {
      const unsub = onSnapshot(doc(db, 'users', trade.authorId), (snap) => {
        if (snap.exists()) {
          setAuthorProfile(snap.data());
        } else {
          setAuthorProfile(null);
        }
      });
      return () => unsub();
    }
  }, [trade.authorId]);

  useEffect(() => {
    setLocalLiked(user ? (trade.likes || []).includes(user.uid) : false);
    setLocalLikeCount((trade.likes || []).length);
  }, [trade.likes, user]);

  if (authorProfile === null) return null; // Hide trades from deleted users

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.uid === trade.authorId) return;

    try {
      // Find or create conversation
      const convsRef = collection(db, 'conversations');
      // Query where the current user is a participant
      const q = query(convsRef, where('participants', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      
      let existingConvId = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Check if the other participant is the trade author
        if (data.participants.length === 2 && data.participants.includes(trade.authorId)) {
          existingConvId = doc.id;
        }
      });

      if (existingConvId) {
        // If it exists, update it to point to the latest trade started from
        await updateDoc(doc(db, 'conversations', existingConvId), {
          activeTradeId: trade.id,
          updatedAt: serverTimestamp()
        });
        navigate(`/messages/${existingConvId}`);
      } else {
        const newConv = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, trade.authorId],
          activeTradeId: trade.id,
          lastMessage: '',
          lastSenderId: '',
          updatedAt: serverTimestamp(),
          unreadCount: { [user.uid]: 0, [trade.authorId]: 0 }
        });
        navigate(`/messages/${newConv.id}`);
      }
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    
    const wasLiked = localLiked;
    setLocalLiked(!wasLiked);
    setLocalLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

    const tradeRef = doc(db, 'trades', trade.id);
    try {
      await updateDoc(tradeRef, {
        likes: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Like error:", err);
      // Revert on error
      setLocalLiked(wasLiked);
      setLocalLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  };

  const handleMarkAsCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.uid !== trade.authorId) return;

    try {
      const tradeRef = doc(db, 'trades', trade.id);
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(tradeRef, { status: 'completed' });
      await updateDoc(userRef, { 
        completedTrades: increment(1),
        reputation: increment(0.1) 
      });
    } catch (err) {
      console.error("Completion error:", err);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative h-full flex flex-col"
    >
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      
      <div className="relative flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-4 shadow-lg transition-all hover:border-cyan-500/40 hover:shadow-cyan-500/5 flex flex-col overflow-hidden group/card h-full">
        {/* Header Section - Compact */}
        <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link to={`/user/${trade.authorId}`} className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-sm">
                {authorProfile?.photoURL ? (
                  <img src={authorProfile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <UserIcon size={16} />
                  </div>
                )}
              </div>
            </Link>
            <div className="min-w-0">
              <Link to={`/user/${trade.authorId}`} className="block">
                <h3 className="font-black text-slate-900 dark:text-white italic tracking-tighter leading-none text-sm truncate hover:text-cyan-600 dark:hover:text-cyan-400 uppercase">
                  {authorProfile?.displayName || 'TRADER_X'}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] text-cyan-600 dark:text-cyan-500 font-bold uppercase tracking-widest leading-none bg-cyan-500/5 px-1.5 py-0.5 rounded-md border border-cyan-500/10">
                  LV.{authorProfile?.level?.split(' ')[0] || '01'}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-800 shrink-0">
                   {authorProfile?.countryCode ? (
                     <img 
                       src={`https://flagcdn.com/w20/${authorProfile.countryCode.toLowerCase()}.png`} 
                       alt="" 
                       className="w-3 h-2 object-contain"
                     />
                   ) : (
                     <Globe size={10} className="text-cyan-500" />
                   )}
                   <span className="text-[8px] text-slate-600 dark:text-slate-200 font-black uppercase tracking-widest truncate">{authorProfile?.country || authorProfile?.location || 'Sector'}</span>
                </span>
              </div>
            </div>
          </div>
          
          {trade?.status === 'completed' && (
            <div className="px-5 py-2 text-[10px] font-black rounded-2xl border uppercase tracking-[0.2em] italic shadow-2xl shrink-0 bg-linear-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 animate-pulse">
              SIGNAL EXECUTED
            </div>
          )}
        </div>
 
        {/* Trade Content - Streamlined */}
        <div className="flex-1">
          <div className="mb-3">
             <h3 className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase leading-snug line-clamp-2">
              {trade?.title || 'Classified Signal'}
            </h3>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Offers</span>
              <p className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase italic tracking-tight truncate pl-4">{trade?.haveItem || '---'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Wants</span>
              <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase italic tracking-tight truncate pl-4">{trade?.wantItem || '---'}</p>
            </div>
          </div>
        </div>
 
        {/* Footer Actions - Compact */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
             <button 
              onClick={handleToggleLike}
              className={cn(
                "flex items-center gap-1.5 transition-all active:scale-90",
                localLiked ? "text-red-500" : "text-slate-400"
              )}
            >
              <Heart size={14} className={cn(localLiked ? "fill-red-500" : "")} />
              <span className="text-[10px] font-black tabular-nums">{localLikeCount}</span>
            </button>
            <div className="flex items-center gap-1 text-slate-300 dark:text-slate-700">
               <Calendar size={12} />
               <span className="text-[8px] font-bold tabular-nums">{formatDate(trade.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.uid !== trade.authorId && trade.status === 'active' ? (
              <button 
                onClick={handleStartChat}
                className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 border border-slate-700 dark:border-slate-200"
              >
                <MessageSquare size={14} />
                Connect
              </button>
            ) : user?.uid === trade.authorId && (
              <div className="flex items-center gap-2">
                {trade.status === 'active' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      showDialog('Authorize Completion', 'Mark this signal as finalized?', 'confirm', () => handleMarkAsCompleted(e));
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95 text-[10px] font-black uppercase tracking-widest"
                  >
                    <CheckCircle size={14} />
                    Finalize
                  </button>
                )}
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    showDialog('Critical Purge', 'Permanently terminate this trade signal?', 'confirm', async () => {
                      try { await deleteDoc(doc(db, 'trades', trade.id)); setDialog(prev => ({ ...prev, isOpen: false })); } catch (err) { console.error(err); }
                    });
                  }}
                  className="p-2.5 bg-red-50 dark:bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-500/20 active:scale-95 shadow-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TradeCard;
