import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, ArrowLeft } from 'lucide-react';
import CustomDialog, { DialogType } from '../components/CustomDialog';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const showDialog = (title: string, message: string, type: DialogType = 'info') => {
    setDialog({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    const authError = localStorage.getItem('auth_error');
    if (authError) {
      showDialog('Access Restricted', authError, 'error');
      localStorage.removeItem('auth_error');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('يجب تفعيل تسجيل الدخول بالبريد الإلكتروني في Firebase.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('خطأ في البريد الإلكتروني أو كلمة المرور.');
      } else if (err.code === 'auth/user-not-found') {
        setError('هذا المستخدم غير موجود.');
      } else if (err.code === 'auth/wrong-password') {
        setError('كلمة المرور غير صحيحة.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl relative z-10 shadow-xl dark:shadow-2xl dark:backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6">
            <span className="text-4xl font-black text-white">T</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Login</h1>
          <p className="text-slate-500 dark:text-slate-500 mt-2 text-sm font-medium">Welcome back to The Safe Corner</p>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-800 text-slate-900 dark:text-slate-200"
              placeholder="name@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-800 text-slate-900 dark:text-slate-200"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
          >
            {loading ? 'Verifying...' : <>
              <LogIn size={20} />
              Login
            </>}
          </button>
        </form>

        <div className="mt-10 text-center text-slate-500 text-sm font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyan-400 font-black hover:text-cyan-300 transition-colors">Join Now</Link>
        </div>

        <Link to="/" className="flex items-center justify-center gap-2 mt-8 text-slate-600 hover:text-slate-400 transition-colors text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
};

export default Login;
