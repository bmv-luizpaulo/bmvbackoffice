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
    if ((query as CollectionReference).path) {
        return (query as CollectionReference).path;
    }
    const internalQuery = (query as any)._query;
    if (internalQuery && internalQuery.path && typeof internalQuery.path.canonicalString === 'function') {
        return internalQuery.path.canonicalString();
    }
    return '(path-not-retrievable)';
}


/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted targetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>)  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!targetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Defensive check to prevent invalid queries from even attempting a snapshot
    const queryPath = getQueryPath(targetRefOrQuery);
    if (!queryPath || queryPath.includes('undefined') || queryPath.includes('null')) {
      setIsLoading(false);
      setData(null);
      setError(null); // Not a server error, but an invalid-state error. Silently fail.
      return;
    }

    setIsLoading(true);
    
    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (!snapshot || !snapshot.docs) {
          setData([]);
          setError(null);
          setIsLoading(false);
          return;
        }
        const results: ResultItemType[] = snapshot.docs.map(doc => {
           const docData = doc.data() as T;
           const dataWithConvertedTimestamps = convertTimestampsToISO(docData);
           return { ...dataWithConvertedTimestamps, id: doc.id };
        });
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const path = getQueryPath(targetRefOrQuery);
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
setData(null);
        setIsLoading(false);

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [targetRefOrQuery]);
  
  return { data, isLoading, error };
}
