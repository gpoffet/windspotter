import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { AuthContextValue, UserPreferences } from '../types/user';
import { DEFAULT_USER_PREFERENCES } from '../types/user';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const [prefsDoc, tokenResult] = await Promise.all([
            getDoc(doc(db, 'users', firebaseUser.uid, 'settings', 'preferences')),
            firebaseUser.getIdTokenResult(),
          ]);
          if (prefsDoc.exists()) {
            setPreferences(prefsDoc.data() as UserPreferences);
          } else {
            setPreferences(DEFAULT_USER_PREFERENCES);
          }
          setIsAdmin(tokenResult.claims.admin === true);
        } catch (err) {
          console.error('Failed to load user preferences:', err);
          setPreferences(DEFAULT_USER_PREFERENCES);
          setIsAdmin(false);
        }
      } else {
        setPreferences(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updatePreferences = useCallback(
    async (partial: Partial<UserPreferences>) => {
      if (!user) return;
      const merged = { ...(preferences ?? DEFAULT_USER_PREFERENCES), ...partial };
      setPreferences(merged);
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'preferences'),
          merged,
        );
      } catch (err) {
        console.error('Failed to save preferences:', err);
      }
    },
    [user, preferences],
  );

  const handleSignOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, preferences, updatePreferences, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
