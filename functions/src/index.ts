
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Change, EventContext } from 'firebase-functions';
import * as cors from 'cors';
import { randomBytes } from "crypto";

const corsHandler = cors({
  origin: [
    'https://sgibmv.vercel.app',
    'http://localhost:9002'
  ],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});


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
    // Busca os claims existentes para não os sobrescrever
    const user = await admin.auth().getUser(userId);
    const existingClaims = user.customClaims || {};

    // Define os custom claims no Firebase Auth
    await admin.auth().setCustomUserClaims(userId, { 
      ...existingClaims,
      isManager, 
      isDev, 
      roleId 
    });
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
export const createUser = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Validação do método HTTP - A preflight request OPTIONS deve passar
    if (req.method !== 'POST') {
      res.status(405).send({ success: false, error: 'Method not allowed' });
      return;
    }

    // 1. Verificação de autenticação e permissão
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        res.status(403).send({ success: false, error: "Unauthorized" });
        return;
    }

    const idToken = req.headers.authorization.split('Bearer ')[1];
    let decodedIdToken;
    try {
        decodedIdToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        functions.logger.error("Error verifying token:", error);
        res.status(403).send({ success: false, error: "Invalid token" });
        return;
    }
    
    const adminUid = decodedIdToken.uid;
    const adminUserDoc = await db.collection('users').doc(adminUid).get();
    const adminUserData = adminUserDoc.data();
    const adminRoleId = adminUserData?.roleId;

    if (!adminRoleId) {
        res.status(403).send({ success: false, error: "Administrador não possui um cargo definido."});
        return;
    }

    const adminRoleDoc = await db.collection('roles').doc(adminRoleId).get();
    const adminRoleData = adminRoleDoc.data();

    if (adminRoleData?.permissions?.isDev !== true && adminRoleData?.permissions?.canManageUsers !== true) {
        res.status(403).send({ success: false, error: "Você não tem permissão para criar usuários."});
        return;
    }

    // 2. Extração e validação dos dados de entrada
    const { email, name, status, ...restOfData } = req.body;
    if (!email || !name) {
        res.status(400).send({ success: false, error: 'O email e o nome do usuário são obrigatórios.'});
        return;
    }

    try {
        // 3. Geração de senha temporária segura
        const tempPassword = `bmv-${randomBytes(4).toString('hex')}`;
        
        // Validação de status
        const allowedStatus = ['active', 'inactive', 'suspended'];
        const safeStatus = allowedStatus.includes(status) ? status : 'active';


        // 4. Criação do usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            emailVerified: true, // É um fluxo administrativo, então confiamos na verificação
            password: tempPassword,
            displayName: name,
            disabled: safeStatus === 'suspended',
        });
        
        // 5. Whitelist de campos para o Firestore
        const allowedFields = ['roleId', 'phone', 'linkedinUrl', 'personalDocument', 'address', 'teamIds'];
        const safeData: { [key: string]: any } = {};
        for (const key of allowedFields) {
          if (restOfData[key] !== undefined) {
            safeData[key] = restOfData[key];
          }
        }

        // 6. Criação do perfil do usuário no Firestore
        const newUserProfile = {
            ...safeData,
            name,
            email,
            status: safeStatus,
            avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("users").doc(userRecord.uid).set(newUserProfile);

        // 7. Retorno do sucesso com as credenciais
        functions.logger.log(`Usuário ${userRecord.uid} criado por ${adminUid}.`);
        res.status(200).send({ success: true, data: { uid: userRecord.uid, email: email, tempPassword: tempPassword } });

    } catch (error: any) {
        functions.logger.error("Erro ao criar usuário na Cloud Function:", error);
        if (error.code === 'auth/email-already-exists') {
             res.status(409).send({ success: false, error: 'Este e-mail já está em uso por outra conta.' });
        } else {
            res.status(500).send({ success: false, error: error.message || 'Ocorreu um erro interno ao criar o usuário.' });
        }
    }
  });
});
