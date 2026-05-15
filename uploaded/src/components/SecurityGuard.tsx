import React, { useState, useEffect } from 'react';
import { ShieldAlert, Globe, Radio } from 'lucide-react';
import { checkSecurityAccess } from '../lib/geoBlock';

const SecurityGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [security, setSecurity] = useState<{ allowed: boolean; reason?: string; country?: string }>({ allowed: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runCheck = async () => {
      const result = await checkSecurityAccess();
      setSecurity(result);
      setLoading(false);
    };
    runCheck();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Running Security Protocols...</span>
      </div>
    );
  }

  if (!security.allowed) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="relative mb-10">
          <div className="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
            <ShieldAlert size={64} className="text-red-500" />
          </div>
          <div className="absolute top-0 right-0 p-3 bg-red-600 rounded-2xl shadow-xl shadow-red-500/20">
             <Radio size={24} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">Access Restricted</h2>
        <div className="px-6 py-2 bg-red-500 rounded-full mb-8 inline-block">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{security.reason}</span>
        </div>
        
        <div className="max-w-md space-y-6">
          <p className="text-slate-500 font-bold uppercase tracking-[0.1em] text-xs leading-relaxed">
            Local firewall detected a non-compliant uplink originating from <span className="text-white">{security.country || 'Unknown Sector'}</span>. 
            Terminal access is strictly regulated for verified localized nodes only.
          </p>
          
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={16} className="text-cyan-500" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocol Instructions</span>
            </div>
            <ul className="text-[10px] text-slate-500 font-bold uppercase space-y-2 leading-tight">
              <li>• TERMINATE ANY ACTIVE VPN/PROXY TUNNELS</li>
              <li>• VERIFY LOCAL SIGNAL AUTHENTICITY</li>
              <li>• CONTACT SYSTEM ADMIN FOR WHITELISTING</li>
            </ul>
          </div>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-12 px-10 py-5 bg-white text-slate-950 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl shadow-white/10"
        >
          Retry Terminal Connection
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default SecurityGuard;
