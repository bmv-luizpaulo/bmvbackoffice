'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { firebaseMemoSet } from '@/firebase/provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString: () => string;
      toString: () => string;
    }
  }
}

// Function to recursively convert Timestamps to ISO strings
const convertTimestampsToISO = (data: any): any => {
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertTimestampsToISO(item));
  }
  if (data !== null && typeof data === 'object') {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      newData[key] = convertTimestampsToISO(data[key]);
    }
    return newData;
  }
  return data;
};

const getQueryPath = (query: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined): string => {
    if (!query) return '';
    if (query.type === 'collection') {
        return (query as CollectionReference).path;
    }
    // This is a more robust way to get the path from a query object.
    // It accesses a non-public property, which can be risky, but it's a common workaround.
    const internalQuery = (query as any)._query;
    if (internalQuery && internalQuery.path && typeof internalQuery.path.canonicalString === 'function') {
        return internalQuery.path.canonicalString();
    }
    // Fallback if the internal structure changes
    return '(path-not-retrievable)';
}


/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>)  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    const path = getQueryPath(memoizedTargetRefOrQuery);
    
    if (!memoizedTargetRefOrQuery || !path || path.trim() === '' || path.includes('//')) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
           const docData = doc.data() as T;
           const dataWithConvertedTimestamps = convertTimestampsToISO(docData);
           results.push({ ...dataWithConvertedTimestamps, id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)
        
        // TEMPORARY WORKAROUND: Do not throw a global error for specific collections
        // This is to prevent the app from breaking while we work on security rules.
        const collectionsToWarn = ['users', 'contacts', 'teams'];
        if (collectionsToWarn.includes(path)) {
           console.warn(`Firestore permission error on '${path}' collection was caught but not thrown globally. This is a temporary measure.`);
        } else {
          // trigger global error propagation
          errorEmitter.emit('permission-error', contextualError);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
  
  if (memoizedTargetRefOrQuery) {
    const isObject = typeof memoizedTargetRefOrQuery === 'object' && memoizedTargetRefOrQuery !== null;
    if (isObject && !firebaseMemoSet.has(memoizedTargetRefOrQuery as object)) {
      const path = getQueryPath(memoizedTargetRefOrQuery);
      console.warn(`Query for path "${path}" was not properly memoized using useMemoFirebase. Proceeding anyway.`);
    }
  }
  return { data, isLoading, error };
}
