
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Change, EventContext } from 'firebase-functions';
import cors from 'cors';
import { randomBytes } from "crypto";

const allowedOrigins = new Set([
  'https://sgibmv.vercel.app',
  'http://localhost:9002',
  'http://127.0.0.1:9002',
]);

const corsHandler = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }
    } catch {
      // ignore
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});


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

    // Force a token refresh on the client
    await db.collection("users").doc(userId).update({
        _tokenRefreshed: admin.firestore.FieldValue.serverTimestamp(),
    });

    return null;
  });


// Cloud Function para criar um novo usuário
export const createUser = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).send({ success: false, error: 'Method not allowed' });
        return;
      }

      try {
        // 1. Verificação de autenticação e permissão
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
          res.status(403).send({ success: false, error: "Unauthorized: Missing or invalid token." });
          return;
        }

        const idToken = req.headers.authorization.split('Bearer ')[1];
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        const adminUid = decodedIdToken.uid;

        let hasPermission = false;
        if (decodedIdToken.isDev === true || decodedIdToken.canManageUsers === true) {
          hasPermission = true;
        }

        if (!hasPermission) {
          const adminUserDoc = await db.collection('users').doc(adminUid).get();
          if (adminUserDoc.exists) {
            const adminUserData = adminUserDoc.data();
            const adminRoleId = adminUserData?.roleId;
            if (adminRoleId) {
              const adminRoleDoc = await db.collection('roles').doc(adminRoleId).get();
              if (adminRoleDoc.exists) {
                const adminRoleData = adminRoleDoc.data();
                if (adminRoleData?.permissions?.isDev === true || adminRoleData?.permissions?.canManageUsers === true) {
                  hasPermission = true;
                }
              }
            }
          }
        }
        
        if (!hasPermission) {
          res.status(403).send({ success: false, error: "Permission denied: You do not have permission to create users."});
          return;
        }

        const { email, name, status, ...restOfData } = req.body;
        if (!email || !name) {
          res.status(400).send({ success: false, error: 'Email and name are required.' });
          return;
        }

        const tempPassword = `bmv-${randomBytes(4).toString('hex')}`;
        const allowedStatus = ['active', 'inactive', 'suspended'];
        const safeStatus = allowedStatus.includes(status) ? status : 'active';

        const userRecord = await admin.auth().createUser({
          email: email,
          emailVerified: false, // O usuário definirá a senha, então não precisa verificar
          password: tempPassword,
          displayName: name,
          disabled: safeStatus !== 'active',
        });

        const allowedFields = ['roleId', 'phone', 'linkedinUrl', 'personalDocument', 'address', 'teamIds'];
        const safeData: { [key: string]: any } = {};
        for (const key of allowedFields) {
          if (restOfData[key] !== undefined) {
            safeData[key] = restOfData[key];
          }
        }
        
        const resetLink = await admin.auth().generatePasswordResetLink(email);

        const newUserProfile = {
          ...safeData,
          name,
          email,
          status: safeStatus,
          avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("users").doc(userRecord.uid).set(newUserProfile);

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

    