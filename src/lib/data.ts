import type { Opportunity, User, Message } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const STAGES = ['Lead', 'Qualificação', 'Proposta', 'Negociação', 'Ganha', 'Perdida'] as const;

export const users: User[] = [
  { id: 'user-1', name: 'Alex Thompson', email: 'alex.t@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' },
  { id: 'user-2', name: 'Brenda Chen', email: 'brenda.c@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '' },
  { id: 'user-3', name: 'Carlos Diaz', email: 'carlos.d@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user3')?.imageUrl || '' },
  { id: 'user-4', name: 'Diana Evans', email: 'diana.e@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user4')?.imageUrl || '' },
  { id: 'user-5', name: 'Ethan Foster', email: 'ethan.f@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user5')?.imageUrl || '' },
];

export const opportunities: Opportunity[] = [
  {
    id: 'opp-001',
    title: 'Implantação do Projeto Phoenix',
    company: 'Innovate Inc.',
    value: 75000,
    stage: 'Proposta',
    lastContact: '2024-05-20T10:00:00Z',
    contacts: [{ id: 'cont-1', name: 'John Doe', role: 'CTO', email: 'john.doe@innovate.com' }],
    history: [
      { stage: 'Lead', date: '2024-04-01' },
      { stage: 'Qualificação', date: '2024-04-15' },
      { stage: 'Proposta', date: '2024-05-10' },
    ],
  },
  {
    id: 'opp-002',
    title: 'Suíte de Software Empresarial',
    company: 'Global Solutions Ltd.',
    value: 120000,
    stage: 'Negociação',
    lastContact: '2024-05-22T14:30:00Z',
    contacts: [{ id: 'cont-2', name: 'Jane Smith', role: 'Diretora de Compras', email: 'jane.smith@globalsolutions.com' }],
    history: [
      { stage: 'Lead', date: '2024-03-10' },
      { stage: 'Qualificação', date: '2024-03-25' },
      { stage: 'Proposta', date: '2024-04-20' },
      { stage: 'Negociação', date: '2024-05-18' },
    ],
  },
  {
    id: 'opp-003',
    title: 'Estratégia de Migração para Nuvem',
    company: 'NextGen Corp.',
    value: 45000,
    stage: 'Qualificação',
    lastContact: '2024-05-18T09:00:00Z',
    contacts: [{ id: 'cont-3', name: 'Peter Jones', role: 'Gerente de TI', email: 'peter.jones@nextgen.com' }],
    history: [{ stage: 'Lead', date: '2024-05-05' }, { stage: 'Qualificação', date: '2024-05-15' }],
  },
  {
    id: 'opp-004',
    title: 'Plataforma de Automação de Marketing',
    company: 'MarketBoost',
    value: 30000,
    stage: 'Lead',
    lastContact: '2024-05-23T11:00:00Z',
    contacts: [{ id: 'cont-4', name: 'Susan Miller', role: 'Chefe de Marketing', email: 'susan.m@marketboost.com' }],
    history: [{ stage: 'Lead', date: '2024-05-23' }],
  },
  {
    id: 'opp-005',
    title: 'Sistema de Gestão de RH',
    company: 'PeopleFirst Inc.',
    value: 60000,
    stage: 'Ganha',
    lastContact: '2024-05-15T16:00:00Z',
    contacts: [{ id: 'cont-5', name: 'Michael Brown', role: 'Diretor de RH', email: 'michael.b@peoplefirst.com' }],
    history: [
      { stage: 'Lead', date: '2024-02-01' },
      { stage: 'Qualificação', date: '2024-02-20' },
      { stage: 'Proposta', date: '2024-03-15' },
      { stage: 'Negociação', date: '2024-04-10' },
      { stage: 'Ganha', date: '2024-05-15' },
    ],
  },
  {
    id: 'opp-006',
    title: 'Auditoria de Cibersegurança',
    company: 'SecureNet',
    value: 25000,
    stage: 'Perdida',
    lastContact: '2024-04-30T12:00:00Z',
    contacts: [{ id: 'cont-6', name: 'Karen White', role: 'CISO', email: 'karen.w@securenet.com' }],
    history: [
      { stage: 'Lead', date: '2024-03-01' },
      { stage: 'Qualificação', date: '2024-03-18' },
      { stage: 'Proposta', date: '2024-04-05' },
      { stage: 'Perdida', date: '2024-04-30' },
    ],
  },
  {
    id: 'opp-007',
    title: 'IA para Otimização Logística',
    company: 'QuickShip Co.',
    value: 250000,
    stage: 'Negociação',
    lastContact: '2024-05-24T15:00:00Z',
    contacts: [{ id: 'cont-7', name: 'David Wilson', role: 'COO', email: 'david.w@quickship.com' }],
    history: [
      { stage: 'Lead', date: '2024-04-10' },
      { stage: 'Qualificação', date: '2024-04-25' },
      { stage: 'Proposta', date: '2024-05-12' },
      { stage: 'Negociação', date: '2024-05-22' },
    ],
  },
  {
    id: 'opp-008',
    title: 'Implementação de Painel de BI',
    company: 'DataDriven Insights',
    value: 85000,
    stage: 'Proposta',
    lastContact: '2024-05-19T17:00:00Z',
    contacts: [{ id: 'cont-8', name: 'Laura Green', role: 'Líder de Análise', email: 'laura.g@datadriven.com' }],
    history: [
        { stage: 'Lead', date: '2024-04-05' },
        { stage: 'Qualificação', date: '2024-4-20' },
        { stage: 'Proposta', date: '2024-05-08' },
    ],
  },
];

export const messages: Message[] = [
  {
    id: 'msg-1',
    sender: users[1], // Brenda
    recipient: users[0], // Alex
    text: "Oi Alex, enviei a proposta para o Projeto Phoenix. Eles devem analisar até o final do dia de sexta-feira.",
    timestamp: '2024-05-20T10:05:00Z',
    read: true,
  },
  {
    id: 'msg-2',
    sender: users[0], // Alex
    recipient: users[1], // Brenda
    text: "Ótimo, obrigado Brenda. Mantenha-me informado sobre o feedback deles.",
    timestamp: '2024-05-20T10:07:00Z',
    read: true,
  },
  {
    id: 'msg-3',
    sender: users[2], // Carlos
    recipient: users[0], // Alex
    text: "A negociação com a Global Solutions está esquentando. Eles estão pedindo um desconto de 15%. Acho que podemos chegar a 10%.",
    timestamp: '2024-05-22T14:35:00Z',
    read: true,
  },
  {
    id: 'msg-4',
    sender: users[0], // Alex
    recipient: users[2], // Carlos
    text: "10% parece razoável. Vamos formalizar isso. Bom trabalho.",
    timestamp: '2024-05-22T14:40:00Z',
    read: false,
  },
    {
    id: 'msg-5',
    sender: users[3], // Diana
    recipient: users[0], // Alex
    text: "Acabei de ter uma ótima ligação inicial com a MarketBoost. Eles estão muito interessados na plataforma de automação. Agendando uma demonstração para a próxima semana.",
    timestamp: '2024-05-23T11:05:00Z',
    read: true,
  },
  {
    id: 'msg-6',
    sender: users[0], // Alex
    recipient: users[3], // Diana
    text: "Excelentes notícias, Diana! Me avise se precisar de apoio para a demonstração.",
    timestamp: '2024-05-23T11:10:00Z',
    read: false,
  },
];

export const chatLogForSummary = messages
  .map(m => `${m.sender.name} para ${m.recipient.name} [${new Date(m.timestamp).toLocaleTimeString()}]: ${m.text}`)
  .join('\n');
