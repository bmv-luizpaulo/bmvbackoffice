
'use client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserActivityLog } from './types';

type ActivityAction = 'login' | 'logout' | 'profile_update' | 'password_change' | 'status_change' | 'role_change';

interface LogActivityParams {
  firestore: any;
  userId: string;
  action: ActivityAction;
  description: string;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logUserActivity({
  firestore,
  userId,
  action,
  description,
  performedBy,
  ipAddress,
  userAgent
}: LogActivityParams): Promise<void> {
  if (!firestore) return;

  try {
    const activityData: Omit<UserActivityLog, 'id'> = {
      userId,
      action,
      description,
      timestamp: serverTimestamp(),
      performedBy: performedBy || userId, // Default to the user if no admin is specified
      ipAddress,
      userAgent
    };

    // Corrigido: Registra na subcoleção do usuário.
    await addDoc(collection(firestore, `users/${userId}/activityLogs`), activityData);
  } catch (error) {
    console.error('Erro ao registrar atividade do usuário:', error);
  }
}

// Funções específicas para diferentes tipos de atividade
export const ActivityLogger = {
  login: (firestore: any, userId: string, ipAddress?: string, userAgent?: string) =>
    logUserActivity({
      firestore,
      userId,
      action: 'login',
      description: 'Usuário fez login no sistema',
      ipAddress,
      userAgent
    }),

  logout: (firestore: any, userId: string) =>
    logUserActivity({
      firestore,
      userId,
      action: 'logout',
      description: 'Usuário fez logout do sistema'
    }),

  profileUpdate: (firestore: any, userId: string, performedBy?: string) =>
    logUserActivity({
      firestore,
      userId,
      action: 'profile_update',
      description: performedBy && performedBy !== userId 
        ? 'Perfil atualizado por administrador' 
        : 'Usuário atualizou seu perfil',
      performedBy
    }),

  passwordChange: (firestore: any, userId: string, performedBy?: string) =>
    logUserActivity({
      firestore,
      userId,
      action: 'password_change',
      description: performedBy && performedBy !== userId
        ? 'Senha alterada por administrador'
        : 'Usuário alterou sua senha',
      performedBy
    }),

  statusChange: (firestore: any, userId: string, newStatus: string, performedBy: string) =>
    logUserActivity({
      firestore,
      userId,
      action: 'status_change',
      description: `Status alterado para: ${newStatus}`,
      performedBy
    }),

  roleChange: (firestore: any, userId: string, newRole: string, performedBy: string) =>
    logUserActivity({
      firestore,
      userId,
      action: 'role_change',
      description: `Cargo alterado para: ${newRole}`,
      performedBy
    })
};
