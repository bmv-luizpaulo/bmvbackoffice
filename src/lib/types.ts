

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

export type Chat = {
  id: string;
  userIds: string[];
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  } | null;
  users: { [key: string]: Pick<User, 'name' | 'avatarUrl' | 'email'> };
}

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  attachment?: string;
};

// Tipos para o Funil de Projetos
export type Project = {
    id: string;
    name: string;
    description: string;
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
    dependentTaskIds?: string[];
    assigneeId?: string;
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
    directorateId?: string;
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
    department?: 'Operações' | 'TI' | 'Financeiro' | 'Comercial' | 'RH' | 'Administrativo';
    hierarchyLevel?: 'CEO' | 'Diretoria' | 'Gerência' | 'Coordenação' | 'Analista' | 'Assistente' | 'Estagiário';
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
    uploadedAt: string;
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
    uploadedAt: string;
}

export type Notification = {
  id: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string; // ISO string
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
    requestDate: string;
    decisionDate?: string;
    approverId?: string;
    receiptUrl?: string;
    notes?: string;
    costCenterId?: string;
};

export type CostCenter = {
    id: string;
    name: string;
    code?: string;
    description?: string;
    responsibleId?: string;
}
