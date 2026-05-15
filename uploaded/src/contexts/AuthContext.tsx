import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { checkSecurityAccess } from '../lib/geoBlock';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
  unreadTotal: number;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null, unreadTotal: 0 });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    let profileUnsub: () => void = () => {};
    let convsUnsub: () => void = () => {};

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Security & Country check
        const security = await checkSecurityAccess();
        
        // Track unread messages
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
        
        convsUnsub = onSnapshot(q, (snap) => {
          let total = 0;
          snap.docs.forEach(doc => {
            const data = doc.data();
            const count = data.unreadCount?.[user.uid] || 0;
            total += count;
          });
          setUnreadTotal(total);
        });

        // Real-time profile sync
        profileUnsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile(data);
            
            // Auto-update metadata if missing or "Unknown" or changed
            const updates: any = {};
            const isUnknownLocale = !data.country || data.country === 'Unknown' || !data.countryCode;
            
            // SECURITY ENFORCEMENT: If country is suddenly blocked by admin session
            if (security.countryCode) {
               const { getDoc, doc } = await import('firebase/firestore');
               const blockRef = doc(db, 'blocked_countries', security.countryCode.toUpperCase());
               const blockSnap = await getDoc(blockRef);
               if (blockSnap.exists() && data.role !== 'owner' && data.role !== 'admin') {
                  await signOut(auth);
                  localStorage.setItem('auth_error', 'Your current access node is within a restricted terminal zone.');
                  return;
               }
            }

            if (security.ip) {
                // Moving IP to private subcollection for privacy
                const { setDoc, serverTimestamp } = await import('firebase/firestore');
                setDoc(doc(db, 'users', user.uid, 'private', 'security'), {
                  lastIP: security.ip,
                  updatedAt: serverTimestamp()
                }, { merge: true }).catch(e => console.warn("Sensitive metadata sync failed:", e));
                
                // ALSO save a non-sensitive flag to public doc that IP is available
                if (!data.hasMetadata) {
                  updates.hasMetadata = true;
                }
            }

            if (isUnknownLocale && security.countryCode) {
              updates.countryCode = security.countryCode;
              updates.country = security.country || 'Unknown';
              if (!data.location || data.location === 'Unknown') {
                updates.location = security.country || 'Unknown';
              }
            }
            
            if (Object.keys(updates).length > 0) {
              updateDoc(doc(db, 'users', user.uid), updates).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));
            }

            // Handle automatic logout if banned
            if (data.banned) {
              await signOut(auth);
              localStorage.setItem('auth_error', 'Your account identity has been terminated by an administrator.');
            }
            setLoading(false);
          } else {
            const newProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
              gender: 'unspecified',
              createdAt: new Date().toISOString(),
              bio: '',
              location: security.country || '',
              country: security.country || 'Unknown',
              countryCode: security.countryCode || '',
              verified: false,
              role: user.email === 'iliassilias19@gmail.com' ? 'owner' : 'user',
              completedTrades: 0,
              reputation: 5.0
            };
            try {
              await setDoc(doc(db, 'users', user.uid), newProfile);
              setProfile(newProfile);
              setLoading(false);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
              setLoading(false);
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });

        const timeout = setTimeout(() => {
          setLoading(false);
        }, 3000);
        return () => clearTimeout(timeout);
      } else {
        setProfile(null);
        setLoading(false);
        setUnreadTotal(0);
        profileUnsub();
        convsUnsub();
      }
    });

    return () => {
      authUnsubscribe();
      profileUnsub();
      convsUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile, unreadTotal }}>
      {loading ? (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6 z-[9999]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-cyan-500/10 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-black text-white italic tracking-tighter">NEON BAZAAR</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] animate-pulse">Establishing Secure Uplink...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
