'use server';

import { getSuggestedFollowUps, SuggestedFollowUpsInput } from "@/ai/flows/ai-suggested-follow-ups";
import { generateDailyChatSummary } from "@/ai/flows/daily-chat-summary";
import { getDocs, collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeFirebase } from "@/firebase";
import type { Project, Task, User } from "./types";
import { unstable_noStore as noStore } from 'next/cache';
import * as admin from 'firebase-admin';
import { headers } from 'next/headers';

// This is a placeholder for a real chat log fetching mechanism
const getChatLogForDay = async (): Promise<string> => {
    return `
      Brenda Chen para Alex Thompson [10:05 AM]: Oi Alex, enviei a proposta para o Projeto Phoenix. Eles devem analisar até o final do dia de sexta-feira.
      Alex Thompson para Brenda Chen [10:07 AM]: Ótimo, obrigado Brenda. Mantenha-me informado sobre o feedback deles.
      Carlos Diaz para Alex Thompson [2:35 PM]: A negociação com a Global Solutions está esquentando. Eles estão pedindo um desconto de 15%. Acho que podemos chegar a 10%.
      Alex Thompson para Carlos Diaz [2:40 PM]: 10% parece razoável. Vamos formalizar isso. Bom trabalho.
      Diana Evans para Alex Thompson [11:05 AM]: Acabei de ter uma ótima ligação inicial com a MarketBoost. Eles estão muito interessados na plataforma de automação. Agendando uma demonstração para a próxima semana.
      Alex Thompson para Diana Evans [11:10 AM]: Excelentes notícias, Diana! Me avise se precisar de apoio para a demonstração.
    `.trim();
};

const getAdminApp = () => {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccount) {
        throw new Error('A chave da conta de serviço do Firebase não está configurada no ambiente.');
    }

    if (admin.apps.length > 0) {
        return admin.app();
    }

    return admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
};

export async function createUserAction(userData: Omit<User, 'id' | 'avatarUrl'>) {
    noStore();
    try {
        const adminApp = getAdminApp();
        const auth = admin.auth(adminApp);
        const firestore = admin.firestore(adminApp);

        // Verify the calling user is an admin/manager
        const idToken = headers().get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return { success: false, error: 'Usuário não autenticado.' };
        }
        const decodedToken = await auth.verifyIdToken(idToken);
        const callingUserDoc = await firestore.collection('users').doc(decodedToken.uid).get();
        const callingUserRoleId = callingUserDoc.data()?.roleId;

        if (!callingUserRoleId) {
             return { success: false, error: 'Permissão negada. Função do usuário não encontrada.' };
        }

        const callingUserRoleDoc = await firestore.collection('roles').doc(callingUserRoleId).get();
        if (!callingUserRoleDoc.data()?.isManager) {
            return { success: false, error: 'Permissão negada. Apenas gestores podem criar usuários.' };
        }


        // Create user in Firebase Auth
        const tempPassword = Math.random().toString(36).slice(-16);
        const userRecord = await auth.createUser({
            email: userData.email,
            emailVerified: false,
            password: tempPassword,
            displayName: userData.name,
            disabled: false,
        });

        // Create user profile in Firestore
        const newUserProfile: Omit<User, 'id'> = {
            ...userData,
            avatarUrl: `https://picsum.photos/seed/${userRecord.uid}/200`
        };
        await firestore.collection("users").doc(userRecord.uid).set(newUserProfile);

        // Send password reset email
        await auth.generatePasswordResetLink(userData.email);

        return { success: true, data: { uid: userRecord.uid } };
    } catch (error: any) {
        console.error("Erro ao criar usuário:", error);
        let errorMessage = 'Ocorreu um erro ao criar o usuário.';
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'Este e-mail já está em uso por outra conta.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'O formato do e-mail é inválido.';
        }
        return { success: false, error: errorMessage };
    }
}


export async function getFollowUpSuggestionsAction(project: Project) {
    noStore();
    try {
        const { firestore } = initializeFirebase();
        const tasksCollection = collection(firestore, `projects/${project.id}/tasks`);
        const tasksSnapshot = await getDocs(tasksCollection);
        const tasks = tasksSnapshot.docs.map(doc => doc.data() as Task);

        const openTasks = tasks.filter(task => !task.isCompleted).map(task => `- ${task.name}`).join('\n');
        const completedTasks = tasks.filter(task => task.isCompleted).map(task => `- ${task.name}`).join('\n');

        const opportunityDetails = `
            Título do Projeto: ${project.name}
            Descrição: ${project.description}
            Data de Início: ${new Date(project.startDate).toLocaleDateString()}
            Tarefas Abertas: 
            ${openTasks || 'Nenhuma'}
        `;
        
        const pastFollowUpActions = `
            O projeto foi iniciado em ${new Date(project.startDate).toLocaleDateString()}.
            Tarefas já concluídas:
            ${completedTasks || 'Nenhuma'}
        `;

        const input: SuggestedFollowUpsInput = {
            opportunityDetails,
            currentPipelineStage: "Em Andamento", 
            pastFollowUpActions
        };
        
        const result = await getSuggestedFollowUps(input);
        
        return { success: true, data: result };
    } catch (error) {
        console.error("Erro ao obter sugestões de IA:", error);
        return { success: false, error: "Falha ao obter sugestões de IA." };
    }
}

export async function getChatSummaryAction() {
    noStore();
    try {
        const chatLog = await getChatLogForDay();
        if (!chatLog) {
             return { success: true, data: { summary: "Nenhuma conversa registrada hoje." } };
        }
        const result = await generateDailyChatSummary({ chatLog });
        return { success: true, data: result };
    } catch (error) {
        console.error("Erro ao gerar resumo do chat:", error);
        return { success: false, error: "Falha ao gerar resumo do chat." };
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
