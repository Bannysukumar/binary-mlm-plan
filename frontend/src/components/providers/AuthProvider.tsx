'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getIdTokenResult } from 'firebase/auth';
import { AuthUser } from '@/lib/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await getIdTokenResult(firebaseUser);
          const user: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: tokenResult.claims.role as any,
            companyId: tokenResult.claims.companyId as string | undefined,
          };
          setUser(user);
        } catch (error: any) {
          // Only log actual errors, ignore browser extension errors
          if (error?.code && !error.code.includes('extension')) {
            console.error('Error getting user token:', error);
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
