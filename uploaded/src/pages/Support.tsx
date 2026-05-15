import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, MessageSquare, Facebook, Send, ExternalLink, ShieldCheck, ShieldAlert, MapPin, Sparkles, User, BadgeCheck, Clock, Users } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { DEVELOPER_SIGNALS } from '../constants';
import CustomDialog from '../components/CustomDialog';
import { cn, formatDate } from '../lib/utils';

const Support = () => {
  const { user, profile } = useAuth();
  const [admin, setAdmin] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' as any });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const q = query(collection(db, 'users'), where('email', '==', 'iliassilias19@gmail.com'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdmin({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAdmin();
  }, []);

  // Fetch conversation history
  const [messagesValue, messagesLoading] = useCollection(
    user ? query(
      collection(db, 'support_messages'),
      where('threadId', '==', user.uid),
      orderBy('createdAt', 'asc')
    ) : null
  );

  const messages = messagesValue?.docs.map(d => ({ id: d.id, ...d.data() })) || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'support_messages'), {
        text: message,
        senderId: user.uid,
        senderName: profile?.displayName || user.email || 'Anonymous',
        senderEmail: user.email,
        threadId: user.uid,
        isAdminReply: false,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      setMessage('');
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to send message.',
        type: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  if (messagesLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 pb-32">
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[780px]">
        {/* Left Info Panel - Developer Info */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-2xl flex flex-col relative overflow-hidden group shadow-2xl shadow-cyan-950/20"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />
            
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                <BadgeCheck size={12} /> Verified Founder
              </div>

              <div className="flex flex-col items-center">
                <div className="w-36 h-36 rounded-[2.5rem] bg-linear-to-br from-cyan-400 via-indigo-500 to-purple-600 p-1 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 relative">
                   <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center text-white z-20">
                      <ShieldCheck size={14} />
                   </div>
                  <div className="w-full h-full bg-slate-950 rounded-[2.3rem] overflow-hidden">
                    {admin?.photoURL ? (
                      <img src={admin.photoURL} alt="" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800">
                        <User size={64} />
                      </div>
                    )}
                  </div>
                </div>
                
                <h1 className="mt-6 text-3xl font-black text-white leading-none tracking-tighter text-center">
                  {admin?.displayName || 'Iliass'} <br /> 
                  <span className="text-cyan-500 italic text-xl">The Developer</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center mt-3 opacity-60">iliassilias19@gmail.com</p>
              </div>

              <div className="space-y-3">
                <a href={DEVELOPER_SIGNALS.facebookPage} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-slate-950/30 border border-slate-800/50 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-indigo-400 group">
                   <Facebook size={20} className="group-hover:rotate-12 transition-transform" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">FB Page</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">Official Page</span>
                   </div>
                </a>
                <a href={DEVELOPER_SIGNALS.facebookGroup} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-slate-950/30 border border-slate-800/50 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-blue-400 group">
                   <Users size={20} className="group-hover:-rotate-12 transition-transform" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">FB Group</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">Community Hub</span>
                   </div>
                </a>
                <a href={`mailto:${admin?.email || 'iliassilias19@gmail.com'}`} className="flex items-center gap-3 p-4 bg-slate-950/30 border border-slate-800/50 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-cyan-400 group">
                   <Mail size={20} className="group-hover:scale-110 transition-transform" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Email</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">Official Intel</span>
                   </div>
                </a>
              </div>

              <button 
                onClick={() => {
                  const input = document.getElementById('support-input');
                  if (input) input.focus();
                }}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-white/5 hover:bg-cyan-400 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <ShieldAlert size={14} className="text-red-500" />
                إبلاغ عن مشكلة
              </button>
            </div>
          </motion.div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] backdrop-blur-xl flex flex-col h-[600px] lg:h-full overflow-hidden shadow-2xl relative">
          <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between relative z-10 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Support Terminal</h3>
              </div>
            </div>
          </div>


          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-600 mb-2">
                  <Sparkles size={40} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-widest">Awaiting First Signal</h4>
                  <p className="text-xs text-slate-500 max-w-[220px] mx-auto mt-2 leading-relaxed">Initiate a secure connection with the administrative team below.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg: any) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex w-full",
                      msg.isAdminReply ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[75%] space-y-1.5",
                      msg.isAdminReply ? "items-start" : "items-end"
                    )}>
                      <div className={cn(
                        "px-6 py-4 rounded-[1.8rem] text-sm leading-relaxed shadow-2xl relative",
                        msg.isAdminReply 
                          ? "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50" 
                          : "bg-linear-to-br from-cyan-600 to-blue-700 text-white rounded-tr-none"
                      )}>
                        {msg.text}
                      </div>
                      <div className={cn(
                        "flex items-center gap-3 px-2",
                        msg.isAdminReply ? "flex-row" : "flex-row-reverse"
                      )}>
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
                          {msg.isAdminReply ? 'System Admin' : 'Sender'}
                        </span>
                        <div className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span className="text-[9px] text-slate-700 tabular-nums">
                          {msg.createdAt ? formatDate(msg.createdAt) : '...'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-slate-950/40 border-t border-slate-800 relative z-10">
            <form onSubmit={handleSubmit} className="relative group">
              <textarea 
                id="support-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose secure message..."
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl py-5 pl-6 pr-20 text-sm text-white outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all resize-none min-h-[70px] max-h-[160px] custom-scrollbar"
              />
              <button 
                type="submit"
                disabled={sending || !message.trim()}
                className="absolute right-3 top-3 bottom-3 px-5 rounded-2xl bg-cyan-600 text-white hover:bg-cyan-500 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-cyan-900/20 flex items-center justify-center"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={22} />
                )}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} className="text-cyan-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Secure Protocol</span>
              </div>
              <div className="w-1 h-1 bg-slate-800 rounded-full" />
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-indigo-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">24h Response</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
