
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
  isUserLoading: boolean; // This will now wait for claims as well
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check AND claims hydration
  userError: Error | null; // Error from auth listener
  // Claims (permissions) hydrated from ID token
  claims: Record<string, any> | null;
  areClaimsReady: boolean; // True once claims have been loaded for the current user
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
  areClaimsReady: boolean;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
}) => {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event AND claims are ready
    userError: null,
  });

  const [claims, setClaims] = useState<Record<string, any> | null>(null);
  const [areClaimsReady, setAreClaimsReady] = useState<boolean>(false);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(0);

  // Effect to subscribe to Firebase auth state changes and manage user profile
  useEffect(() => {
    if (!auth || !firestore) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: true, userError: null }); // Keep loading until claims are ready
        setAreClaimsReady(false);

        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdTokenResult(false);
            setClaims(token?.claims || {});
          } catch (e) {
            setClaims(null);
          } finally {
            setAreClaimsReady(true);
            setUserAuthState(prev => ({ ...prev, isUserLoading: false })); // Now we are fully loaded
            setLastTokenRefresh(Date.now());
          }
        } else {
          setClaims(null);
          setAreClaimsReady(true);
          setUserAuthState({ user: null, isUserLoading: false, userError: null }); // Not logged in, so we are "loaded"
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
        setClaims(null);
        setAreClaimsReady(true);
      }
    );

    return () => unsubscribe();
  }, [auth, firestore]);

  // Effect to force token refresh when claims might have changed
  useEffect(() => {
    if (userAuthState.user && firestore) {
      const userDocRef = doc(firestore, 'users', userAuthState.user.uid);
      
      const unsubscribe = onSnapshot(userDocRef, async (docSnapshot) => {
        const userData = docSnapshot.data() as UserProfile | undefined;
        const tokenRefreshedTime = userData?._tokenRefreshed?.toDate()?.getTime();
        
        // If a refresh timestamp exists and it's newer than our last refresh, force a new token
        if (tokenRefreshedTime && tokenRefreshedTime > lastTokenRefresh) {
          console.log("Detected role change, forcing token refresh...");
          setUserAuthState(prev => ({ ...prev, isUserLoading: true }));
          setAreClaimsReady(false);
          try {
            const token = await userAuthState.user?.getIdTokenResult(true); // Force refresh
            setClaims(token?.claims || {});
          } catch (e) {
            console.error("Error refreshing token after role change:", e);
          } finally {
            setAreClaimsReady(true);
            setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
            setLastTokenRefresh(Date.now());
          }
        }
      });

      return () => unsubscribe();
    }
  }, [userAuthState.user, firestore, lastTokenRefresh]);


  // Memoize the context value
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
      areClaimsReady,
    };
  }, [firebaseApp, firestore, auth, userAuthState, claims, areClaimsReady]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
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
    areClaimsReady: context.areClaimsReady,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError };
};

// Permissions hook based on claims-only
export const usePermissions = () => {
  const { claims, areClaimsReady } = useFirebase();
  const has = (key: string) => !!(claims && (claims as any)[key] === true);
  return {
    ready: areClaimsReady,
    claims: claims || {},
    isManager: has('isManager'),
    isDev: has('isDev'),
    has,
  } as const;
};
