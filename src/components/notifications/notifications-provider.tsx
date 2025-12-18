'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  useFirestore,
  useUser,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import type { Notification, NotificationTemplate } from '@/lib/types';


interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  createNotification: (
    userId: string,
    templateId: string,
    data: Record<string, any>
  ) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationsQuery = useMemoFirebase(
    () =>
      user?.uid && firestore
        ? query(
            collection(firestore, `users/${user.uid}/notifications`),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        : null,
    [firestore, user?.uid]
  );

  const { data: notifications, isLoading } =
    useCollection<Notification>(notificationsQuery);

  useEffect(() => {
    if (notifications) {
      const count = notifications.filter((n) => !n.isRead).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [notifications]);

  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!firestore || !user?.uid) return;
      const notifRef = doc(
        firestore,
        `users/${user.uid}/notifications`,
        notificationId
      );
      updateDocumentNonBlocking(notifRef, { isRead: true });
    },
    [firestore, user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!firestore || !user?.uid || unreadCount === 0 || !notifications) return;

    const unreadNotifications = notifications.filter((n) => !n.isRead);
    const batch = writeBatch(firestore);

    unreadNotifications.forEach((notification) => {
      const notifRef = doc(
        firestore,
        `users/${user.uid}/notifications`,
        notification.id
      );
      batch.update(notifRef, { isRead: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [firestore, user, notifications, unreadCount]);

  const createNotification = useCallback(
    async (
      userId: string,
      templateId: string,
      data: Record<string, any>
    ) => {
      if (!firestore) return;

      try {
        const templateRef = doc(firestore, 'notificationTemplates', templateId);
        const templateSnap = await getDoc(templateRef);

        if (!templateSnap.exists()) {
          console.error(`Notification template "${templateId}" not found.`);
          return;
        }

        const template = templateSnap.data() as NotificationTemplate;

        // Replace placeholders in message and link
        const message = template.message.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
        const link = template.link.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');

        const newNotification = {
          title: template.title,
          message,
          link,
          isRead: false,
          createdAt: serverTimestamp(),
        };

        const notificationsCollection = collection(firestore, `users/${userId}/notifications`);
        await addDocumentNonBlocking(notificationsCollection, newNotification);

      } catch (error) {
        console.error('Error creating notification from template:', error);
      }
    },
    [firestore]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications: notifications || [],
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        createNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider'
    );
  }
  return context;
};

    