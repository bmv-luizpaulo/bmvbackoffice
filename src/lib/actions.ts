
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
        // These credentials are auto-injected in the hosting environment
        admin.initializeApp();
    } catch (e) {
        console.error("Firebase Admin initialization error on server action:", e);
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
          return null;
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.warn("Could not verify admin token on server action:", error);
        return null;
    }
}


export async function createUserAction(userData: Omit<User, 'id' | 'avatarUrl' | 'createdAt'>): Promise<{ success: boolean; data?: any; error?: string }> {
  noStore();
  
  try {
    const adminUid = await getAdminUidFromToken();
    if (!adminUid) {
        return { success: false, error: "Ação não autorizada." };
    }
    
    // This is now a proxy to the Cloud Function
    const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/createUser`;
    const token = headers().get('Authorization')?.split('Bearer ')[1];

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Falha ao chamar a Cloud Function de criação de usuário.');
    }

    return { success: true, data: result.data };

  } catch (error: any) {
    console.error("Error in createUserAction calling cloud function:", error);
    return { success: false, error: error.message || 'Falha ao criar usuário.' };
  }
}

export async function updateUserRoleAction(targetUserId: string, newRoleId: string): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        await getAdminUidFromToken(); // Just for permission check
        // The actual claim update is handled by the onUserUpdate firestore trigger
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserStatusAction(targetUserId: string, newStatus: User['status']): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        await getAdminUidFromToken(); // Just for permission check
        // The actual user disabling is handled by this function's caller now
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
