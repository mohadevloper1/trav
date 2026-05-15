import React, { useState, useEffect } from 'react';
import { WifiOff, ShieldAlert } from 'lucide-react';

const OfflineGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasConnection, setHasConnection] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkConnectivity = async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setHasConnection(false);
      return;
    }

    setChecking(true);
    try {
      // Try to fetch a small resource to verify real internet
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      // Use multiple endpoints for redundancy
      const endpoints = ['/favicon.ico', 'https://www.google.com/favicon.ico'];
      let success = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { 
            method: 'HEAD',
            mode: 'no-cors', // Use no-cors for external domains
            signal: controller.signal,
            cache: 'no-store'
          });
          if (response) {
            success = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      clearTimeout(timeoutId);
      setIsOnline(true);
      setHasConnection(true);
    } catch (error: any) {
      // In case of any error, we rely on navigator.onLine as the ultimate source of truth
      // to avoid blocking users in complex networking environments (proxies, etc)
      if (navigator.onLine) {
        setIsOnline(true);
        setHasConnection(true);
      } else {
        setIsOnline(false);
        setHasConnection(false);
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectivity();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setHasConnection(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);
    
    // Initial check
    checkConnectivity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!isOnline || !hasConnection) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
            <WifiOff size={48} className="text-red-500" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-slate-950 p-2 rounded-full border border-red-500/20">
            <ShieldAlert size={20} className="text-red-500" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Uplink Interrupted</h2>
        <p className="text-slate-500 max-w-sm font-black uppercase tracking-[0.2em] text-[10px] leading-relaxed">
          The Safe Corner requires a verified synchronous connection to the terminal. 
          Your current session is in restricted mode due to signal loss.
        </p>
        
        <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            disabled={checking}
            className="w-full px-8 py-4 bg-white text-slate-950 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-xl shadow-white/5 disabled:opacity-50"
          >
            {checking ? 'Re-establishing...' : 'Reconnect Terminal'}
          </button>
          <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest italic animate-pulse">
            Encrypting connection...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default OfflineGuard;
