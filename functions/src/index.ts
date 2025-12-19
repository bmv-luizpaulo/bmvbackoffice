
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Change, EventContext } from 'firebase-functions';
import cors from 'cors';
import { randomBytes } from "crypto";

// Use default import for cors
const corsHandler = cors({ origin: true });

admin.initializeApp();

const db = admin.firestore();

// Função para definir os custom claims com base no roleId
const setCustomClaimsForUser = async (userId: string, roleId: string | null) => {
  const permissions: { [key: string]: boolean } = {};

  if (roleId) {
    try {
      const roleDoc = await db.collection("roles").doc(roleId).get();
      if (roleDoc.exists) {
        const roleData = roleDoc.data();
        if (roleData?.permissions) {
          // Mapeia todas as chaves do objeto de permissões para os claims
          for (const key in roleData.permissions) {
            if (typeof roleData.permissions[key] === 'boolean') {
              permissions[key] = roleData.permissions[key];
            }
          }
        }
      } else {
        functions.logger.warn(`Role document ${roleId} not found for user ${userId}.`);
      }
    } catch (error) {
      functions.logger.error(`Error fetching role ${roleId} for user ${userId}:`, error);
      return;
    }
  }

  try {
    const user = await admin.auth().getUser(userId);
    const existingClaims = user.customClaims || {};

    const newClaims = {
      ...existingClaims,
      ...permissions,
      roleId: roleId || null, // Garante que o roleId também seja um claim
    };

    // Define os custom claims no Firebase Auth
    await admin.auth().setCustomUserClaims(userId, newClaims);
    functions.logger.log(`Successfully set custom claims for user ${userId}:`, newClaims);

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
      return null;
    }

    const roleId = afterData.roleId || null;
    functions.logger.log(`User ${userId} role changed to: ${roleId}. Updating claims...`);
    await setCustomClaimsForUser(userId, roleId);

    return null;
  });


// Cloud Function para criar um novo usuário
export const createUser = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      try {
        // 1. Verificação de autenticação e permissão do admin que está fazendo a chamada
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
          res.status(403).send({ success: false, error: "Unauthorized: Missing or invalid token." });
          return;
        }

        const idToken = req.headers.authorization.split('Bearer ')[1];
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        const adminUid = decodedIdToken.uid;

        // Verificar se o admin tem permissão para criar usuários (isDev ou canManageUsers)
        if (decodedIdToken.isDev !== true && decodedIdToken.canManageUsers !== true) {
           res.status(403).send({ success: false, error: "Permission denied: You do not have permission to create users."});
           return;
        }

        const { email, name, ...restOfData } = req.body;
        if (!email || !name) {
          res.status(400).send({ success: false, error: 'Email and name are required.' });
          return;
        }

        const tempPassword = `bmv-${randomBytes(4).toString('hex')}`;
        const status = restOfData.status || 'active';

        // 2. Criar usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
          email: email,
          emailVerified: false,
          password: tempPassword,
          displayName: name,
          disabled: status !== 'active',
        });

        const resetLink = await admin.auth().generatePasswordResetLink(email);

        // 3. Criar o perfil do usuário no Firestore
        const newUserProfile = {
          ...restOfData,
          name,
          email,
          status,
          avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("users").doc(userRecord.uid).set(newUserProfile);
        // O gatilho onUserCreate cuidará de definir as claims iniciais

        functions.logger.log(`User ${userRecord.uid} created by ${adminUid}.`);
        res.status(200).send({ 
            success: true, 
            data: { 
                uid: userRecord.uid, 
                email: email, 
                tempPassword: tempPassword,
                resetLink: resetLink
            } 
        });

      } catch (error: any) {
        functions.logger.error("Error creating user in Cloud Function:", error);
        if (error.code === 'auth/email-already-exists') {
          res.status(409).send({ success: false, error: 'This email is already in use by another account.' });
        } else if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
          res.status(403).send({ success: false, error: "Unauthorized: Token has expired or is invalid." });
        } else {
          res.status(500).send({ success: false, error: error.message || 'An internal error occurred while creating the user.' });
        }
      }
    });
});
