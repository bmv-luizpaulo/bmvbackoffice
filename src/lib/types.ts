'use client';


export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  roleId?: string;
  phone?: string;
  linkedinUrl?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  personalDocument?: string;
  teamIds?: string[];
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  type: 'cliente' | 'fornecedor' | 'parceiro';
  linkedinUrl?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
};

export type Opportunity = {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: 'Lead' | 'Qualificação' | 'Proposta' | 'Negociação' | 'Ganha' | 'Perdida';
  lastContact: string;
  contacts: Contact[];
  history: { stage: string; date: string }[];
};

// Tipos para o Funil de Projetos
export type Project = {
    id: string;
    name: string;
    description: string;
    budget?: number;
    startDate: string;
    endDate?: string;
    ownerId: string;
    teamMembers?: string[];
    contactPhone?: string;
    technicalDetails?: string;
};

export type Stage = {
    id: string;
    name: string;
    description?: string;
    order: number;
};

export type Task = {
    id: string;
    name: string;
    description?: string;
    projectId: string;
    stageId: string;
    isCompleted: boolean;
    createdAt: any;
    dependentTaskIds?: string[];
    assigneeId?: string;
    teamId?: string; // ID da equipe responsável
    dueDate?: string;
    isRecurring?: boolean;
    recurrenceFrequency?: 'diaria' | 'semanal' | 'mensal';
    recurrenceEndDate?: string;
};

export type Team = {
    id: string;
    name: string;
    description?: string;
    leaderId?: string;
    directorateId: string;
    teamType?: 'Operacional' | 'Técnica' | 'Suporte' | 'Projeto' | 'Administrativa';
    responsibilities?: string;
    kpis?: string;
};

export type Directorate = {
    id: string;
    name: string;
    description?: string;
    directorId?: string;
};

export type Role = {
    id: string;
    name: string;
    description?: string;
    department: 'Operações' | 'TI' | 'Financeiro' | 'Comercial' | 'RH' | 'Administrativo';
    hierarchyLevel: 'CEO' | 'Diretoria' | 'Gerência' | 'Coordenação' | 'Analista' | 'Assistente' | 'Estagiário';
    supervisorRoleId?: string;
    mission?: string;
    responsibilities?: string[];
    kpis?: string[];
    requiredSkills?: string[];
    salaryRange?: {
        min?: number;
        max?: number;
    };
    isManager?: boolean;
    isDev?: boolean;
};


export type ProjectFile = {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: any;
    uploaderId: string;
}

export type Contract = {
    id: string;
    title: string;
    description?: string;
    contractType: 'Garantia' | 'Serviço' | 'Acordo de Nível de Serviço (SLA)' | 'Aluguel' | 'Outros';
    vendor?: string;
    assetId?: string;
    projectId?: string;
    startDate: string;
    endDate: string;
    fileUrl: string;
    uploaderId: string;
    uploadedAt: any;
}

export type Notification = {
  id: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: any;
};

export type Product = {
    id: string;
    name: string;
    description?: string;
    sku?: string;
    status: 'Ativo' | 'Inativo';
};

export type Seal = {
    id: string;
    productId: string;
    contactId: string;
    issueDate: string;
    expiryDate: string;
    status: 'Solicitado' | 'Ativo' | 'Vencido' | 'Em Renovação';
};

export type Checklist = {
  id: string;
  name: string;
  description?: string;
  teamId: string;
};

export type ChecklistItem = {
  id: string;
  checklistId: string;
  description: string;
  order: number;
  isCompleted: boolean;
};

export type Asset = {
    id: string;
    name: string;
    description?: string;
    serialNumber?: string;
    type: 'Físico' | 'Digital';
    status: 'Em Uso' | 'Em Manutenção' | 'Disponível' | 'Descartado';
    location?: string;
    purchaseDate?: string;
    purchaseValue?: number;
    assigneeId?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
};

export type AssetHistory = {
    id: string;
    assetId: string;
    event: string;
    details?: Record<string, any>;
    actorId: string;
    timestamp: string;
}

export type AssetMaintenance = {
    id: string;
    assetId: string;
    scheduledDate: string;
    completedDate?: string;
    description: string;
    cost?: number;
    status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
}

export type Reimbursement = {
    id: string;
    requesterId: string;
    description: string;
    amount: number;
    status: 'Pendente' | 'Aprovado' | 'Recusado';
    requestDate: any;
    decisionDate?: any;
    approverId?: string;
    receiptUrl?: string;
    notes?: string;
    costCenterId?: string;
    projectId?: string;
};

export type CostCenter = {
    id: string;
    name: string;
    code?: string;
    description?: string;
    responsibleId?: string;
}

export type Conversation = {
    id: string;
    type: 'direct' | 'group';
    name?: string; // For group conversations
    isGlobal?: boolean; // For the global "Geral" forum
    userIds: string[];
    lastMessage: {
        text: string;
        timestamp: any;
        senderId: string;
    } | null;
    users: Record<string, {
        name: string;
        avatarUrl: string;
        email: string;
    }>;
}

export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    timestamp: any;
    read: boolean;
}
