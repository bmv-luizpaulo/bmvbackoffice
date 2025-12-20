
'use client';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { 
  getFirestore, 
  type Firestore,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  DocumentData,
  Query,
} from 'firebase/firestore';
import { DependencyList, useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// --- Singleton Pattern for Firebase Services ---
// We use a global symbol to store the instances so they persist across hot-reloads in development.
const FIREBASE_SERVICES_SYMBOL = Symbol.for('firebase_services_singleton');

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

function getFirebaseServices(): FirebaseServices {
  const globalWithFirebase = globalThis as typeof globalThis & {
    [FIREBASE_SERVICES_SYMBOL]?: FirebaseServices;
  };

  if (globalWithFirebase[FIREBASE_SERVICES_SYMBOL]) {
    return globalWithFirebase[FIREBASE_SERVICES_SYMBOL];
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  const services: FirebaseServices = { firebaseApp: app, auth, firestore };
  globalWithFirebase[FIREBASE_SERVICES_SYMBOL] = services;
  
  return services;
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  return getFirebaseServices();
}

const getQueryPathFromDeps = (deps: DependencyList): string => {
    // Creates a stable string key from dependencies. This includes primitive values
    // and specific properties of Firestore objects.
    return deps.map(dep => {
        if (dep === null) return 'null';
        if (dep === undefined) return 'undefined';
        if (typeof dep === 'string' || typeof dep === 'boolean' || typeof dep === 'number') {
            return dep.toString();
        }
        if (typeof dep === 'object' && dep !== null) {
            // Firestore Query/Reference objects have a path property
            if ('path' in dep && typeof (dep as any).path === 'string') {
                return (dep as any).path;
            }
            // More complex queries might have it nested
            if ('_query' in dep && (dep as any)._query?.path?.canonicalString) {
                return (dep as any)._query.path.canonicalString();
            }
        }
        // For other object types, return a generic placeholder.
        // This is not perfect but covers the most common cases for Firestore queries.
        return 'obj';
    }).join('|');
}

/**
 * Custom hook to memoize Firebase queries.
 * This is a wrapper around `React.useMemo` that helps to ensure that
 * query objects are not re-created on every render, which can cause
 * infinite loops in `useCollection` or `useDoc`.
 * It now returns null if any dependency is null or undefined, and uses
 * a generated key from dependencies to ensure stability.
 */
export function useMemoFirebase<T extends DocumentReference | CollectionReference | Query | null>(factory: () => T, deps: DependencyList): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoizedKey = useMemo(() => getQueryPathFromDeps(deps), deps);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => {
        if (deps.some(dep => dep === undefined)) {
            return null as T;
        }
        return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memoizedKey]); // The key is now stable unless the actual query path/params change
}


/**
 * Initiates an addDoc operation for a collection reference.
 * It does not block the UI but will throw a global, catchable error on permission failure.
 * Returns the DocumentReference on success.
 */
export async function addDocumentNonBlocking(colRef: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  try {
    const docRef = await addDoc(colRef, data);
    return docRef;
  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    // Re-throw the original error to allow local promise rejection handling if needed
    throw serverError;
  }
}

/**
 * Initiates a setDoc operation. It does not block the UI thread.
 * On permission error, it emits a global error event.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: DocumentData, options?: SetOptions): void {
  setDoc(docRef, data, options || {}).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: options && 'merge' in options ? 'update' : 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates an updateDoc operation. It does not block the UI thread.
 * On permission error, it emits a global error event.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: DocumentData): void {
  updateDoc(docRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates a deleteDoc operation. It does not block the UI thread.
 * On permission error, it emits a global error event.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference): void {
  deleteDoc(docRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export { useUser, useAuth, useFirestore, useFirebaseApp, useFirebase, FirebaseProvider, usePermissions } from './provider';
export { FirebaseClientProvider } from './client-provider';
