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
  status?: 'active' | 'inactive' | 'suspended';
  createdAt?: any;
  lastLoginAt?: any;
  lastActivityAt?: any;
  loginCount?: number;
  _tokenRefreshed?: any;
};

export type UserActivityLog = {
  id: string;
  userId: string;
  action: 'login' | 'logout' | 'profile_update' | 'password_change' | 'status_change' | 'role_change';
  description: string;
  timestamp: any;
  ipAddress?: string;
  userAgent?: string;
  performedBy?: string; // ID do usuário que executou a ação (para mudanças administrativas)
};

export type Contact = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  celular?: string;
  telefone?: string;
  createdAt: any;
  situacao: 'Ativo' | 'Inativo' | 'Bloqueado';
  tipo: 'cliente' | 'fornecedor' | 'parceiro';
  documento: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  autenticacao: 'Verificado' | 'Não verificado' | 'Pendente';
  address: {
    cep: string;
    rua: string;
    cidade: string;
    numero: string;
    complemento?: string;
    bairro: string;
    pais: string;
  };
  // Campos antigos para manter a compatibilidade se necessário, mas que devem ser migrados.
  // Podem ser removidos após a migração dos dados.
  fullName?: string;
  personType?: 'Pessoa Física' | 'Pessoa Jurídica';
  cpf?: string;
  cnpj?: string;
  legalName?: string;
  tradeName?: string;
  phone?: string;
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
    startDate: string;
    endDate?: string;
    ownerId: string;
    teamMembers?: string[];
    teamIds?: string[];
    contactPhone?: string;
    technicalDetails?: string;
    status: 'Em execução' | 'Arquivado';
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
    completedAt?: any;
    dependentTaskIds?: string[];
    assigneeId?: string;
    teamId?: string;
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
    permissions?: {
      isDev?: boolean;
      isManager?: boolean;
      canViewAllProjects?: boolean;
      canManageProjects?: boolean;
      canManageUsers?: boolean;
      canManageContacts?: boolean;
      canManageProductsAndSeals?: boolean;
      canAccessFinancial?: boolean;
      canManageChecklists?: boolean;
      canManageAssets?: boolean;
      canManageSupport?: boolean;
    };
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
  status?: 'ativo' | 'arquivado';
  deadlineDate?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: 'diaria' | 'semanal' | 'mensal';
  creatorId: string;
  createdAt: any;
};

export type ChecklistItem = {
  id: string;
  checklistId: string;
  type: 'item' | 'header' | 'yes_no';
  description: string;
  order: number;
  isCompleted?: boolean;
  answer?: 'yes' | 'no' | 'unanswered';
  comment?: string;
};

export type ChecklistExecution = {
    id: string;
    checklistId: string;
    checklistName: string;
    createdAt: any;
    teamId: string;
    executedAt: any;
    executedBy: string;
    items: ChecklistItem[];
}

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
    timestamp: any;
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
    archived?: boolean;
    teamId?: string;
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

export type Ticket = {
    id: string;
    title: string;
    description: string;
    requesterId: string;
    assigneeId?: string;
    status: 'Aberto' | 'Em Andamento' | 'Fechado';
    priority: 'Baixa' | 'Média' | 'Alta';
    createdAt: any;
    updatedAt?: any;
}

export type DeveloperTool = {
    id: string;
    name: string;
    description: string;
    componentName: string;
    requiresDevRole: boolean;
}

export type ErrorLog = {
    id: string;
    userId: string;
    errorCode: string;
    errorMessage: string;
    errorStack: string;
    componentStack: string;
    pageUrl: string;
    userAgent: string;
    timestamp: any;
    isResolved: boolean;
}