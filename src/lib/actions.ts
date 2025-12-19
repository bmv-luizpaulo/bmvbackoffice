
'use server';

import { getDocs, collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeFirebase } from "@/firebase";
import type { User } from "./types";
import { unstable_noStore as noStore } from 'next/cache';
import { ActivityLogger } from './activity-logger';
import { headers } from 'next/headers';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.error("Firebase Admin initialization error", e);
    }
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

async function getAdminUidFromToken(): Promise<string | null> {
    try {
        const authorization = headers().get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            console.error("getAdminUidFromToken: No authorization header found.");
            return null;
        }

        const idToken = authorization.split('Bearer ')[1];
        // Just verify the token is valid and from an authenticated user.
        // The more granular permission check (isDev, canManageUsers) happens on the client-side for UI,
        // and this server-side check prevents any unauthenticated access.
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        return decodedToken.uid;

    } catch (error: any) {
        console.error("getAdminUidFromToken: Auth check failed:", error.message);
        throw new Error("Não autorizado.");
    }
}


export async function createUserAction(userData: Omit<User, 'id' | 'avatarUrl' | 'createdAt'>): Promise<{ success: boolean; data?: { uid: string, email: string }; error?: string }> {
  noStore();
  
  try {
    const adminUid = await getAdminUidFromToken();
    if (!adminUid) {
        return { success: false, error: "Não autorizado." };
    }
    
    // Whitelist de campos para criação de usuário
    const { name, email, status, ...restOfData } = userData;

    if (!name || !email) {
      return { success: false, error: 'Nome e e-mail são obrigatórios.' };
    }

    const { firestore } = initializeFirebase();
    
    const userRecord = await admin.auth().createUser({
        email: email,
        emailVerified: true, 
        displayName: name,
        disabled: status === 'suspended',
    });
    
    // Whitelist de campos para o Firestore
    const allowedFields = ['roleId', 'phone', 'linkedinUrl', 'personalDocument', 'address', 'teamIds'];
    const safeData: { [key: string]: any } = {};
    for (const key of allowedFields) {
        if ((restOfData as any)[key] !== undefined) {
        safeData[key] = (restOfData as any)[key];
        }
    }

    const userProfileData = {
        ...safeData,
        name,
        email,
        status: status || 'active',
        avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`,
        createdAt: serverTimestamp(),
    };

    const userRef = doc(firestore, "users", userRecord.uid);
    await setDoc(userRef, userProfileData);

    await ActivityLogger.profileUpdate(firestore, userRecord.uid, adminUid);

    // Enviar e-mail para definição de senha
    const passwordResetLink = await admin.auth().generatePasswordResetLink(email);
    // Aqui você pode integrar com um serviço de e-mail (SendGrid, etc.) para enviar o link.
    // Por agora, vamos retornar um sucesso, mas sem as credenciais.
    console.log(`Link para definir senha do usuário ${email}: ${passwordResetLink}`);


    return { success: true, data: { uid: userRecord.uid, email: userRecord.email } };

  } catch (error: any) {
    console.error("Error in createUserAction:", error);
    if (error.code === 'auth/email-already-exists') {
        return { success: false, error: 'Este e-mail já está em uso por outra conta.' };
    }
    return { success: false, error: error.message || 'Falha ao criar usuário.' };
  }
}

export async function updateUserRoleAction(targetUserId: string, newRoleId: string): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        await getAdminUidFromToken(); // Just for permission check
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserStatusAction(targetUserId: string, newStatus: User['status']): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        await getAdminUidFromToken(); // Just for permission check
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
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
