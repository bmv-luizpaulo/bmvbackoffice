
'use server';

import { getDocs, collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeFirebase } from "@/firebase";
import type { User } from "./types";
import { unstable_noStore as noStore } from 'next/cache';
import { ActivityLogger } from './activity-logger';
import { headers } from 'next/headers';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    // Note: This relies on environment variables being set in your deployment environment
    // GOOGLE_APPLICATION_CREDENTIALS for local dev, or default service account in production
    admin.initializeApp();
}

type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
};

export async function getCepInfoAction(cep: string): Promise<{ success: boolean; data?: Partial<ViaCepResponse>; error?: string }> {
    noStore();
    const cepDigits = cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
        return { success: false, error: "CEP inválido." };
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        if (!response.ok) {
            throw new Error('Falha ao buscar o CEP.');
        }
        const data: ViaCepResponse = await response.json();
        if (data.erro) {
            return { success: false, error: "CEP não encontrado." };
        }
        return { success: true, data };
    } catch (error) {
        console.error("Erro ao buscar CEP na ViaCEP:", error);
        return { success: false, error: "Não foi possível buscar o CEP." };
    }
}

async function verifyAdminPermission() {
    const authorization = headers().get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        throw new Error("Não autorizado: Token não fornecido.");
    }
    const idToken = authorization.split('Bearer ')[1];
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    const { firestore } = initializeFirebase();
    const adminUserDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    
    if (!adminUserDoc.exists) {
        throw new Error("Não autorizado: Perfil do administrador não encontrado.");
    }
    
    const adminUserData = adminUserDoc.data();
    const adminRoleId = adminUserData?.roleId;

    if (!adminRoleId) {
        throw new Error("Não autorizado: Administrador não possui um cargo definido.");
    }

    const adminRoleDoc = await firestore.collection('roles').doc(adminRoleId).get();
    if (!adminRoleDoc.exists || (!adminRoleDoc.data()?.permissions?.isDev && !adminRoleDoc.data()?.permissions?.canManageUsers)) {
        throw new Error("Não autorizado: Você não tem permissão para criar usuários.");
    }

    return decodedToken.uid;
}

export async function createUserAction(userData: Omit<User, 'id' | 'avatarUrl' | 'createdAt'>): Promise<{ success: boolean; data?: { uid: string, email: string }; error?: string }> {
  noStore();
  
  try {
    const adminUid = await verifyAdminPermission();
    
    const { firestore } = initializeFirebase();
    
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
        email: userData.email,
        emailVerified: true, // Admin-created users are considered verified
        displayName: userData.name,
        disabled: userData.status === 'suspended',
    });
    
    // Create user profile in Firestore
    const userRef = doc(firestore, "users", userRecord.uid);
    await setDoc(userRef, {
      ...userData,
      avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`,
      createdAt: serverTimestamp(),
    });

    await ActivityLogger.profileUpdate(firestore, userRecord.uid, adminUid);

    return { success: true, data: { uid: userRecord.uid, email: userRecord.email } };

  } catch (error: any) {
    console.error("Error in createUserAction:", error);
    if (error.code === 'auth/email-already-exists') {
        return { success: false, error: 'Este e-mail já está em uso por outra conta.' };
    }
    return { success: false, error: error.message || 'Falha ao criar usuário.' };
  }
}

export async function uploadProjectFileAction(formData: FormData) {
    noStore();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const uploaderId = formData.get('uploaderId') as string;

    if (!file || !projectId || !uploaderId) {
        return { success: false, error: 'Dados inválidos.' };
    }

    try {
        const { firestore } = initializeFirebase();
        const storage = getStorage();
        const filePath = `projects/${projectId}/${Date.now()}_${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        // Upload file
        const fileBuffer = await file.arrayBuffer();
        const snapshot = await uploadBytes(fileStorageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Save metadata to Firestore
        const filesCollection = collection(firestore, `projects/${projectId}/files`);
        await addDoc(filesCollection, {
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.type,
            uploadedAt: serverTimestamp(),
            uploaderId: uploaderId,
        });

        return { success: true, data: { url: downloadURL } };
    } catch (error) {
        console.error("Erro no upload de arquivo:", error);
        return { success: false, error: 'Falha ao enviar o arquivo.' };
    }
}


export async function uploadReimbursementReceiptAction(formData: FormData) {
    noStore();
    const file = formData.get('file') as File;

    if (!file) {
        return { success: false, error: 'Nenhum arquivo enviado.' };
    }

    try {
        const storage = getStorage();
        const filePath = `reimbursements/${Date.now()}_${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        const fileBuffer = await file.arrayBuffer();
        const snapshot = await uploadBytes(fileStorageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { success: true, data: { url: downloadURL } };
    } catch (error) {
        console.error("Erro no upload de comprovante:", error);
        return { success: false, error: 'Falha ao enviar o comprovante.' };
    }
}

export async function uploadContractFileAction(formData: FormData) {
    noStore();
    const file = formData.get('file') as File;

    if (!file) {
        return { success: false, error: 'Nenhum arquivo de contrato enviado.' };
    }

    try {
        const storage = getStorage();
        const filePath = `contracts/${Date.now()}_${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        const fileBuffer = await file.arrayBuffer();
        const snapshot = await uploadBytes(fileStorageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { success: true, data: { url: downloadURL } };
    } catch (error) {
        console.error("Erro no upload de contrato:", error);
        return { success: false, error: 'Falha ao enviar o arquivo do contrato.' };
    }
}

    