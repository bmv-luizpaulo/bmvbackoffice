
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import type { User as UserProfile } from '@/lib/types';
import { initializeFirebase } from './index';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: Record<string, any> | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: Record<string, any> | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
}) => {
  const { firebaseApp, auth, firestore } = initializeFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const [claims, setClaims] = useState<Record<string, any> | null>(null);
  const [tokenRefreshTime, setTokenRefreshTime] = useState<number | null>(null);

  // Effect 1: Handle auth state changes from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsUserLoading(true); // Start loading whenever auth state might change
      setUser(firebaseUser);
      setClaims(null); // Reset claims immediately

      if (firebaseUser) {
        try {
          // Force refresh is not consistently reliable here on first load.
          // Getting the token result is the most reliable way to get initial claims.
          const tokenResult = await getIdTokenResult(firebaseUser);
          setClaims(tokenResult.claims);
        } catch (e) {
          console.error("FirebaseProvider: Error fetching user claims on auth change:", e);
          setUserError(e as Error);
          setClaims(null);
        } finally {
          setIsUserLoading(false); // Stop loading once claims are processed
        }
      } else {
        setIsUserLoading(false); // No user, stop loading
        setUserError(null);
      }
    }, (error) => {
      console.error("FirebaseProvider: onAuthStateChanged error:", error);
      setUser(null);
      setClaims(null);
      setUserError(error);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Effect 2: Force a token refresh when _tokenRefreshed is updated in Firestore
  useEffect(() => {
    if (user && tokenRefreshTime) {
      const forceRefresh = async () => {
        setIsUserLoading(true); // Indicate loading during refresh
        try {
          const tokenResult = await getIdTokenResult(user, true); // Force refresh
          setClaims(tokenResult.claims);
        } catch (e) {
          console.error("FirebaseProvider: Error forcing token refresh:", e);
        } finally {
          setIsUserLoading(false);
        }
      };
      forceRefresh();
    }
  }, [user, tokenRefreshTime]);
  
  // Effect 3: Listen for Firestore document changes to trigger a token refresh
  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        const userData = docSnapshot.data() as UserProfile | undefined;
        if (userData?._tokenRefreshed) {
           const serverRefreshTime = userData._tokenRefreshed.toDate().getTime();
           if (serverRefreshTime > (tokenRefreshTime || 0)) {
              console.log("Detected role change from Firestore, triggering client token refresh.");
              setTokenRefreshTime(serverRefreshTime);
           }
        }
      }, (error) => {
          console.error("Error listening to user document for token refresh:", error);
      });
      return () => unsubscribe();
    }
  }, [user, firestore]);


  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
    claims,
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError, claims]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// --- HOOKS ---

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider setup.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    claims: context.claims,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

export const usePermissions = () => {
  const { claims, isUserLoading } = useFirebase();
  
  // Permissions are ready only when user loading is complete.
  const ready = !isUserLoading;

  const has = (key: string) => !!(ready && claims && (claims as any)[key] === true);

  return {
    ready,
    claims: claims || {},
    isManager: has('isManager'),
    isDev: has('isDev'),
    has,
  } as const;
};
