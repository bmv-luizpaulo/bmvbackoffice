
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Change, EventContext } from 'firebase-functions';


admin.initializeApp();

const db = admin.firestore();

// Função para definir os custom claims com base no roleId
const setCustomClaimsForUser = async (userId: string, roleId: string | null) => {
  let isManager = false;
  let isDev = false;

  if (roleId) {
    try {
      const roleDoc = await db.collection("roles").doc(roleId).get();
      if (roleDoc.exists) {
        const roleData = roleDoc.data();
        // Usa a nova estrutura de permissões
        isManager = roleData?.permissions?.isManager === true;
        isDev = roleData?.permissions?.isDev === true;
      } else {
        functions.logger.warn(`Role document ${roleId} not found for user ${userId}.`);
      }
    } catch (error) {
      functions.logger.error(`Error fetching role ${roleId} for user ${userId}:`, error);
      // Não prosseguir se não conseguir ler o cargo
      return;
    }
  }

  try {
    // Define os custom claims no Firebase Auth
    await admin.auth().setCustomUserClaims(userId, { isManager, isDev, roleId });
    functions.logger.log(`Successfully set custom claims for user ${userId}:`, { isManager, isDev, roleId });

    // Dispara a atualização do token no cliente
    await db.collection("users").doc(userId).update({
      _tokenRefreshed: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.log(`Triggered token refresh for user ${userId}.`);
  } catch (error) {
    functions.logger.error(`Error setting custom claims or triggering refresh for user ${userId}:`, error);
  }
};

// Gatilho para quando um novo usuário é criado no Firestore.
export const onUserCreate = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snapshot: QueryDocumentSnapshot, context: EventContext) => {
    const userId = context.params.userId;
    const userData = snapshot.data();
    const roleId = userData.roleId || null;

    functions.logger.log(`New user created: ${userId} with roleId: ${roleId}. Setting claims...`);
    await setCustomClaimsForUser(userId, roleId);
  });

// Gatilho para quando um usuário é atualizado no Firestore.
export const onUserUpdate = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change: Change<QueryDocumentSnapshot>, context: EventContext) => {
    const userId = context.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Verifica se o roleId mudou
    if (beforeData.roleId === afterData.roleId) {
      functions.logger.log(`Role for user ${userId} has not changed. No claim update needed.`);
      return null;
    }

    const roleId = afterData.roleId || null;
    functions.logger.log(`User ${userId} role changed to: ${roleId}. Updating claims...`);
    await setCustomClaimsForUser(userId, roleId);
    return null;
  });


// Cloud Function para criar um novo usuário
export const createUser = functions.https.onCall(async (data, context) => {
    // 1. Verificação de autenticação e permissão
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    
    const adminUid = context.auth.uid;
    const adminUserDoc = await db.collection('users').doc(adminUid).get();
    const adminUserData = adminUserDoc.data();
    const adminRoleId = adminUserData?.roleId;

    if (!adminRoleId) {
        throw new functions.https.HttpsError('permission-denied', 'Administrador não possui um cargo definido.');
    }

    const adminRoleDoc = await db.collection('roles').doc(adminRoleId).get();
    const adminRoleData = adminRoleDoc.data();

    if (adminRoleData?.permissions?.isDev !== true && adminRoleData?.permissions?.canManageUsers !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para criar usuários.');
    }

    // 2. Extração e validação dos dados de entrada
    const { email, name, status, ...restOfData } = data;
    if (!email || !name) {
        throw new functions.https.HttpsError('invalid-argument', 'O email e o nome do usuário são obrigatórios.');
    }

    try {
        // 3. Geração de senha temporária
        const tempPassword = `bmv-${Math.random().toString(36).slice(-6)}`;

        // 4. Criação do usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            emailVerified: true,
            password: tempPassword,
            displayName: name,
            disabled: status === 'suspended',
        });

        // 5. Criação do perfil do usuário no Firestore
        const newUserProfile = {
            ...restOfData,
            name,
            email,
            status: status || 'active',
            avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("users").doc(userRecord.uid).set(newUserProfile);

        // 6. Retorno do sucesso com as credenciais
        functions.logger.log(`Usuário ${userRecord.uid} criado por ${adminUid}.`);
        return { success: true, data: { uid: userRecord.uid, email: email, tempPassword: tempPassword } };

    } catch (error: any) {
        functions.logger.error("Erro ao criar usuário na Cloud Function:", error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Este e-mail já está em uso por outra conta.');
        }
        throw new functions.https.HttpsError('internal', 'Ocorreu um erro interno ao criar o usuário.', error.message);
    }
});
