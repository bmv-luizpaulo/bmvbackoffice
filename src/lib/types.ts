export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role?: 'Gestor' | 'Funcionário';
  phone?: string;
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
  name:string;
  role: string;
  email: string;
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
