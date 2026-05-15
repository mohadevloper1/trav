import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, doc, addDoc, serverTimestamp, updateDoc, limit, getDoc, deleteDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, User, Search, MoreVertical, Paperclip, Smile, ArrowRight, X, Trash2, Plane, Star } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import CustomDialog, { DialogType } from '../components/CustomDialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Messages = () => {
  const { user } = useAuth();
  const { id: activeConversationId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activeTrade, setActiveTrade] = useState<any>(null);

  // Get all conversations for current user
  const [convsValue, convsLoading] = useCollection(
    user ? query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    ) : null
  );

  const conversations = convsValue?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

	const [activeConvValue] = useDocument(
		activeConversationId ? doc(db, 'conversations', activeConversationId) : null
	);
	const activeConv: any = activeConvValue?.data();

  useEffect(() => {
    if (!activeConv?.activeTradeId) {
      setActiveTrade(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'trades', activeConv.activeTradeId), (snap) => {
      if (snap.exists()) setActiveTrade({ id: snap.id, ...snap.data() });
      else setActiveTrade(null);
    }, (error) => {
      console.error("Trade snapshot error:", error);
      setActiveTrade(null);
    });

    return () => unsub();
  }, [activeConv?.activeTradeId]);

  const handleConfirmTrade = async () => {
    if (!activeTrade || !user || !activeConversationId || !activeConv) return;
    
    showDialog(
      'Confirm Trade',
      'Are you sure you want to mark this trade as completed? Both parties must confirm for it to take effect.',
      'confirm',
      async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const isAuthor = user.uid === activeTrade.authorId;
          const partnerId = activeConv.participants.find((p: string) => p !== user.uid);
          
          const updateRef = doc(db, 'trades', activeTrade.id);
          const updateData: any = {};
          
          if (isAuthor) {
            updateData.authorConfirmed = true;
          } else {
            updateData.offererConfirmed = true;
            updateData.offererId = user.uid;
          }
          
          await updateDoc(updateRef, updateData);
          
          const freshSnap = await getDoc(updateRef);
          const freshData = freshSnap.data();
          
          if (freshData?.authorConfirmed && freshData?.offererConfirmed) {
            await updateDoc(updateRef, { status: 'completed' });
            
            const authorRef = doc(db, 'users', activeTrade.authorId);
            const offererRef = doc(db, 'users', freshData.offererId);
            
            await updateDoc(authorRef, { 
              completedTrades: increment(1),
              reputation: increment(0.1)
            });
            await updateDoc(offererRef, { 
              completedTrades: increment(1),
              reputation: increment(0.1)
            });
            
            showDialog('Trade Completed!', 'Handshake successful. Both merchants awarded reputation.', 'success');
          } else {
            showDialog('Agreement Logged', 'Waiting for the other party to confirm the handshake.', 'info');
          }
          
          // Refresh local state
          const finalSnap = await getDoc(updateRef);
          setActiveTrade({ id: activeTrade.id, ...finalSnap.data() });
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

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

  const [otherUser, setOtherUser] = useState<any>(undefined); // undefined = loading, null = deleted
  const [otherUserLoading, setOtherUserLoading] = useState(false);

  // Stabilize participants for the effect
  const participantsKey = activeConv?.participants?.join(',');

  useEffect(() => {
    let isMounted = true;
    
    // Clear state when conversation changes to prevent flickering
    setOtherUser(undefined);
    setOtherUserLoading(true);

    if (activeConv && user) {
      const otherId = activeConv.participants?.find((p: string) => p !== user.uid);
      if (otherId) {
        getDoc(doc(db, 'users', otherId)).then(snap => {
          if (isMounted) {
            setOtherUser(snap.exists() ? { ...snap.data(), uid: snap.id } : null);
          }
        }).catch((err) => {
          console.error("User fetch error:", err);
          if (isMounted) setOtherUser(null);
        }).finally(() => {
          if (isMounted) setOtherUserLoading(false);
        });
      } else {
        if (isMounted) {
          setOtherUser(null);
          setOtherUserLoading(false);
        }
      }
    } else {
      if (isMounted) {
        setOtherUser(undefined);
        setOtherUserLoading(false);
      }
    }
    return () => { isMounted = false; };
  }, [activeConversationId, participantsKey, user?.uid]);

  // Get messages for active conversation
  const [messagesValue, messagesLoading] = useCollection(
    activeConversationId ? query(
      collection(db, 'conversations', activeConversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    ) : null
  );
  const messages = messagesValue?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 900000) { 
        showDialog('File Too Large', 'File size too large. Keep it under 900KB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [sending, setSending] = useState(false);

  // Reset unread counts when opening conversation
  useEffect(() => {
    if (activeConversationId && user) {
      const resetUnread = async () => {
        try {
          await updateDoc(doc(db, 'conversations', activeConversationId), {
            [`unreadCount.${user.uid}`]: 0
          });
        } catch (err) {
          console.error("Reset unread error:", err);
        }
      };
      resetUnread();
    }
  }, [activeConversationId, user?.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeId = activeConversationId;
    
    // Validate
    if (!user || !activeId || sending) return;
    const trimmedMsg = message.trim();
    if (!trimmedMsg && !previewImage) return;

    setSending(true);
    const msgToHide = trimmedMsg;
    const imgToHide = previewImage;
    
    // Clear UI immediately
    setMessage('');
    setPreviewImage(null);

    const otherId = activeConv?.participants?.find((p: string) => p !== user.uid);

    try {
      // 1. Send it
      const messagesRef = collection(db, 'conversations', activeId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: trimmedMsg || null,
        imageUrl: imgToHide || null,
        createdAt: serverTimestamp(),
        isRead: false
      });

      // 2. Update metadata
      const updateData: any = {
        lastMessage: imgToHide ? '📷 Photo' : (trimmedMsg || 'Message'),
        lastSenderId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (otherId) {
        updateData[`unreadCount.${otherId}`] = increment(1);
      }

      await updateDoc(doc(db, 'conversations', activeId), updateData);
    } catch (err) {
      console.error('Send error:', err);
      setMessage(msgToHide);
      setPreviewImage(imgToHide);
      showDialog('Send Error', 'Could not send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConversationId || !user) {
      console.error('Delete failed: Missing activeConversationId or user');
      return;
    }
    
    showDialog(
      'Delete Message',
      'Are you sure you want to delete this message?',
      'confirm',
      async () => {
        try {
          const msgRef = doc(db, 'conversations', activeConversationId, 'messages', msgId);
          await deleteDoc(msgRef);
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          console.error('Delete error detail:', err);
          showDialog('Error', 'Could not delete message.', 'error');
        }
      }
    );
  };

  const getOtherParticipant = (participants: string[]) => {
    return participants.find(p => p !== user?.uid);
  };

  return (
    <div className="h-[calc(100vh-180px)] bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col md:flex-row relative shadow-xl dark:shadow-none">
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      <div className="absolute inset-0 bg-cyan-500/2 rounded-3xl pointer-events-none" />

      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/20 z-10",
        activeConversationId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black italic flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
              <MessageSquare className="text-cyan-600 dark:text-cyan-400" size={20} />
              Inbox
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter threads..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-cyan-500/30 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {convsLoading ? (
            <div className="p-4 text-center text-slate-400 dark:text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Scanning Transmissions...</div>
          ) : conversations.length > 0 ? (
            conversations.map((conv: any) => (
              <ConversationItem 
                key={conv.id} 
                conv={conv} 
                active={activeConversationId === conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                currentUserId={user?.uid || ''}
              />
            ))
          ) : (
            <div className="p-10 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-200 dark:text-slate-800">
                <MessageSquare size={24} />
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed px-4">
                No active conversations yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col z-10 bg-white dark:bg-transparent",
        !activeConversationId ? "hidden md:flex" : "flex"
      )}>
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 md:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/messages')}
                  className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ArrowRight className="rotate-180" size={20} />
                </button>
                <div 
                  onClick={() => otherUser?.uid && navigate(`/user/${otherUser.uid}`)}
                  className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-500/50 transition-all"
                >
                  {otherUserLoading || otherUser === undefined ? (
                    <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-500 border-t-transparent rounded-full animate-spin" />
                  ) : otherUser?.photoURL ? (
                    <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className={cn(otherUser === null ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-400")} />
                  )}
                </div>
                <div onClick={() => otherUser?.uid && navigate(`/user/${otherUser.uid}`)} className="cursor-pointer group/header">
                  <h3 className="font-black italic text-slate-900 dark:text-slate-200 uppercase tracking-tighter group-hover/header:text-cyan-500 transition-colors">
                    {(otherUserLoading || otherUser === undefined) ? 'Connecting...' : (otherUser?.displayName || 'Closed Account')}
                  </h3>
                  {!otherUserLoading && otherUser && otherUser.status !== 'closed' && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-500 uppercase font-black tracking-widest tracking-[0.1em]">Active Trader</span>
                    </div>
                  )}
                  {!otherUserLoading && (otherUser === null || otherUser?.status === 'closed') && (
                    <div className="flex items-center gap-2 opacity-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest italic tracking-[0.1em]">{otherUser?.status === 'closed' ? 'Closed Account' : 'Gone Offline'}</span>
                    </div>
                  )}
                </div>
              </div>
              <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-300 transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Trade Tracker Bar */}
            {activeTrade && activeTrade.status !== 'completed' && (
              <div className="bg-cyan-500/5 dark:bg-cyan-400/5 border-b border-cyan-500/10 p-3 px-6 flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600">
                      <ArrowRight size={16} />
                   </div>
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Mission: {activeTrade.haveItem} ↔ {activeTrade.wantItem}</span>
                       <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase italic truncate max-w-[150px] md:max-w-xs tracking-tight">{activeTrade.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="hidden md:flex flex-col items-end mr-2">
                      <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Handshake Status</span>
                      <div className="flex gap-1 mt-0.5">
                         <div className={cn("w-1.5 h-1.5 rounded-full border border-cyan-500/20", activeTrade.authorConfirmed ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-800")} title="Author" />
                         <div className={cn("w-1.5 h-1.5 rounded-full border border-cyan-500/20", activeTrade.offererConfirmed ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-800")} title="Merchant" />
                      </div>
                   </div>
                   <button 
                    disabled={(user?.uid === activeTrade.authorId && activeTrade.authorConfirmed) || (user?.uid !== activeTrade.authorId && activeTrade.offererConfirmed)}
                    onClick={handleConfirmTrade}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      ((user?.uid === activeTrade.authorId && activeTrade.authorConfirmed) || (user?.uid !== activeTrade.authorId && activeTrade.offererConfirmed))
                        ? "bg-emerald-500/20 text-emerald-500 cursor-default border border-emerald-500/20"
                        : "bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20"
                    )}
                   >
                     {((user?.uid === activeTrade.authorId && activeTrade.authorConfirmed) || (user?.uid !== activeTrade.authorId && activeTrade.offererConfirmed))
                      ? 'Agreement Sent' 
                      : 'Confirm Complete'}
                   </button>
                </div>
              </div>
            )}
            {activeTrade && activeTrade.status === 'completed' && (
               <div className="bg-emerald-500/5 border-b border-emerald-500/10 p-2 px-6 flex items-center justify-center gap-3">
                  <Star size={12} className="text-emerald-500 fill-emerald-500/20" />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Handshake Protocol Finalized - Reputation Synchronized</span>
               </div>
            )}

            {/* Messages Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20"
            >
              {messagesLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                  <div className="w-8 h-8 border-2 border-cyan-600 dark:border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Decrypting Archive...</span>
                </div>
              ) : messages.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {messages.map((msg: any) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: msg.senderId === user?.uid ? 20 : -20 }}
                        transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 350 }}
                        className={cn(
                          "flex flex-col max-w-[85%] md:max-w-[75%] group",
                          msg.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className={cn(
                          "relative px-4 py-2.5 rounded-2xl text-[13px] font-bold shadow-sm transition-all border",
                          msg.senderId === user?.uid 
                            ? "bg-linear-to-br from-cyan-600 to-indigo-600 dark:from-cyan-600 dark:to-indigo-600 text-white rounded-tr-none border-transparent" 
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border-slate-200 dark:border-slate-700/50"
                        )}>
                          {msg.imageUrl && (
                            <div className="mb-2.5 overflow-hidden rounded-xl">
                              <img 
                                src={msg.imageUrl} 
                                alt="Shared" 
                                className="max-w-[180px] md:max-w-[280px] max-h-64 object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity rounded-xl shadow-md" 
                                onClick={() => window.open(msg.imageUrl, '_blank')}
                              />
                            </div>
                          )}
                          {msg.text && (
                            <div className="break-words leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-0 prose-a:text-cyan-400 prose-a:underline hover:prose-a:text-cyan-300">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} />
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          )}
                          
                          {msg.senderId === user?.uid && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/50 shadow-sm"
                              title="Delete message"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-600 mt-1.5 uppercase font-black tracking-widest px-2">
                          {msg.createdAt ? formatDate(msg.createdAt) : 'Transmitting...'}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-800">
                    <Smile size={32} />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">No messages yet. Say hello!</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              {!otherUserLoading && (otherUser === null || otherUser?.status === 'closed') && activeConv ? (
                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest italic block mb-1">
                    Terminal Read-Only Mode
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-tight">This account has been decommissioned. Thread preserved.</p>
                </div>
              ) : (
                <>
                  {previewImage && (
                    <div className="mb-4 relative inline-block animate-in fade-in zoom-in duration-200">
                      <img src={previewImage} alt="Preview" className="w-32 h-32 object-cover rounded-2xl border-4 border-cyan-500/20 dark:border-cyan-500/20 shadow-2xl" />
                      <button 
                        onClick={() => setPreviewImage(null)}
                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-400 transition-colors border-2 border-white dark:border-slate-900"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form 
                    onSubmit={handleSendMessage} 
                    className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 pr-4 shadow-sm dark:shadow-2xl focus-within:border-cyan-500/30 transition-all transition-shadow"
                  >
                    <div className="flex items-center border-r border-slate-200 dark:border-slate-800 px-1 mr-1">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-all active:scale-90"
                        title="Attach Visuals"
                        disabled={sending}
                      >
                        <Plane size={20} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                    <input 
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Compose transmission..."
                      className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-400 dark:placeholder:text-slate-700"
                      disabled={sending}
                    />
                    <button 
                      type="submit"
                      disabled={(!message.trim() && !previewImage) || sending}
                      className={cn(
                        "p-3 rounded-2xl shadow-lg transition-all flex-shrink-0 active:scale-95 flex items-center justify-center min-w-[48px] min-h-[48px]",
                        (message.trim() || previewImage) && !sending
                          ? "bg-linear-to-br from-cyan-400 to-indigo-600 text-white shadow-cyan-500/30 hover:scale-105"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700/50 shadow-none"
                      )}
                    >
                      {sending ? (
                         <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send size={20} className={cn((message.trim() || previewImage) ? "fill-white/20" : "")} />
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/20 dark:bg-transparent">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl dark:shadow-none group">
              <MessageSquare size={36} className="text-slate-200 dark:text-slate-800 group-hover:scale-110 transition-transform" />
            </div>
            <h2 className="text-2xl font-black italic mb-3 text-slate-900 dark:text-white uppercase tracking-tighter italic">Secure Transmissions</h2>
            <p className="text-slate-500 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed">Select a secure channel to initiate terminal negotiation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ConversationItemProps {
  conv: any;
  active: boolean;
  onClick: () => void;
  currentUserId: string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conv, active, onClick, currentUserId }) => {
  const [otherUser, setOtherUser] = useState<any>(undefined); // undefined = loading, null = deleted
  const navigate = useNavigate();

  useEffect(() => {
    const otherId = conv?.participants?.find((p: string) => p !== currentUserId);
    if (otherId) {
      getDoc(doc(db, 'users', otherId)).then(snap => {
        setOtherUser(snap.exists() ? { ...snap.data(), uid: snap.id } : null);
      }).catch(() => setOtherUser(null));
    }
  }, [conv, currentUserId]);

  return (
     <div 
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl cursor-pointer transition-all border border-transparent flex gap-4 mx-1",
        active 
          ? "bg-linear-to-br from-cyan-600/10 to-indigo-600/10 border-cyan-500/20 shadow-md scale-[1.02]" 
          : "hover:bg-slate-100 dark:hover:bg-slate-900/50"
      )}
    >
      <div className="relative flex-shrink-0">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (otherUser?.uid) navigate(`/user/${otherUser.uid}`);
          }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group-hover:rotate-3 transition-transform hover:ring-2 hover:ring-cyan-500/50"
        >
          {otherUser?.photoURL ? (
            <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              {otherUser === undefined ? (
                <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                  <User size={24} className={cn(otherUser === null ? "text-slate-200 dark:text-slate-800" : "text-slate-300 dark:text-slate-600")} />
                </div>
              )}
            </div>
          )}
        </div>
        {otherUser && otherUser.status !== 'closed' && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-start mb-1">
          <span className={cn("font-black text-[11px] truncate uppercase tracking-tighter", active ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>
            {otherUser === undefined ? '...' : (otherUser === null || otherUser?.status === 'closed' ? 'Closed Account' : (otherUser?.displayName || '...'))}
          </span>
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 whitespace-nowrap uppercase italic">{conv.updatedAt ? formatDate(conv.updatedAt) : ''}</span>
        </div>
        <p className={cn("text-[10px] truncate leading-tight font-bold", active ? "text-cyan-700 dark:text-slate-400" : "text-slate-400 dark:text-slate-600")}>
          {conv.lastSenderId === currentUserId && <span className="opacity-50">You: </span>}
          {conv.lastMessage || 'Channel established'}
        </p>
      </div>
      {conv.unreadCount?.[currentUserId] > 0 && !active && (
        <div className="w-5 h-5 bg-linear-to-r from-red-500 to-pink-500 text-[10px] font-black text-white rounded-full flex items-center justify-center shadow-lg transform animate-pulse self-center">
          {conv.unreadCount[currentUserId]}
        </div>
      )}
      {active && <div className="w-1 h-8 bg-cyan-500 rounded-full self-center ml-2 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
    </div>
  );
};

export default Messages;
