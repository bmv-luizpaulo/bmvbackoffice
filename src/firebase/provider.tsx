
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import type { User as UserProfile } from '@/lib/types';
import { initializeFirebase } from './index';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  user: User | null;
  isUserLoading: boolean; // True during initial auth check AND claims hydration
  userError: Error | null; // Error from auth listener
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

  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const [claims, setClaims] = useState<Record<string, any> | null>(null);
  const [tokenRefreshTrigger, setTokenRefreshTrigger] = useState(0);

  // Effect 1: Subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: true, userError: null });
        if (!firebaseUser) {
          // If no user, claims are definitely not ready, and we are "loaded"
          setClaims(null);
          setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
        }
        // The claims loading logic is now handled in the next effect
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
        setClaims(null);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  // Effect 2: Load claims when user changes or a refresh is triggered
  useEffect(() => {
    const loadClaims = async () => {
      if (userAuthState.user) {
        try {
          const tokenResult = await userAuthState.user.getIdTokenResult(true); // Force refresh
          setClaims(tokenResult.claims);
        } catch (e) {
          console.error("Error fetching user claims:", e);
          setClaims(null);
        } finally {
          setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
        }
      }
    };
    
    loadClaims();
  }, [userAuthState.user, tokenRefreshTrigger]);

  // Effect 3: Listen for Firestore document changes to trigger a token refresh
  useEffect(() => {
    if (userAuthState.user && firestore) {
      const userDocRef = doc(firestore, 'users', userAuthState.user.uid);
      
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        const userData = docSnapshot.data() as UserProfile | undefined;
        const tokenRefreshedTime = userData?._tokenRefreshed?.toDate()?.getTime();

        if (tokenRefreshedTime) {
           console.log("Detected role change, triggering token refresh...");
           setTokenRefreshTrigger(Date.now());
        }
      });

      return () => unsubscribe();
    }
  }, [userAuthState.user, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      claims,
    };
  }, [firebaseApp, firestore, auth, userAuthState, claims]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
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
  const has = (key: string) => !!(claims && (claims as any)[key] === true);
  return {
    ready: !isUserLoading, // Claims are ready when the user is no longer loading
    claims: claims || {},
    isManager: has('isManager'),
    isDev: has('isDev'),
    has,
  } as const;
};
