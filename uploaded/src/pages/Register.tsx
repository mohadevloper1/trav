import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { UserPlus, ArrowLeft } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      // We don't create the doc here anymore. 
      // AuthContext will detect the missing doc and create it with defaults.
      // This prevents race conditions and black screens.

      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please enable it in Firebase Console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Try logging in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. It must be at least 6 characters.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl relative z-10 shadow-xl dark:shadow-2xl dark:backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <span className="text-4xl font-black text-white">T</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Sign Up</h1>
          <p className="text-slate-500 dark:text-slate-500 mt-2 text-sm font-medium">Join the community in one simple step</p>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Nickname</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-800 text-slate-900 dark:text-slate-200"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-800 text-slate-900 dark:text-slate-200"
              placeholder="example@mail.com"
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
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
          >
            {loading ? 'Creating Account...' : <>
              <UserPlus size={20} />
              Create Account
            </>}
          </button>
        </form>

        <div className="mt-10 text-center text-slate-500 text-sm font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 font-black hover:text-indigo-300 transition-colors">Login here</Link>
        </div>

        <Link to="/" className="flex items-center justify-center gap-2 mt-8 text-slate-600 hover:text-slate-400 transition-colors text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
};

export default Register;
