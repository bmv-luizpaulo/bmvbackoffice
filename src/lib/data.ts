import type { User, Message } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const users: User[] = [
  { id: 'user-1', name: 'Alex Thompson', email: 'alex.t@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '', role: 'Gestor' },
  { id: 'user-2', name: 'Brenda Chen', email: 'brenda.c@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '', role: 'Funcionário' },
  { id: 'user-3', name: 'Carlos Diaz', email: 'carlos.d@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user3')?.imageUrl || '', role: 'Funcionário' },
  { id: 'user-4', name: 'Diana Evans', email: 'diana.e@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user4')?.imageUrl || '', role: 'Funcionário' },
  { id: 'user-5', name: 'Ethan Foster', email: 'ethan.f@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user5')?.imageUrl || '', role: 'Funcionário' },
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
