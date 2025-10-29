import type { User } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const users: User[] = [
  { id: 'user-1', name: 'Alex Thompson', email: 'alex.t@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '', role: 'Gestor' },
  { id: 'user-2', name: 'Brenda Chen', email: 'brenda.c@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '', role: 'Funcionário' },
  { id: 'user-3', name: 'Carlos Diaz', email: 'carlos.d@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user3')?.imageUrl || '', role: 'Funcionário' },
  { id: 'user-4', name: 'Diana Evans', email: 'diana.e@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user4')?.imageUrl || '', role: 'Funcionário' },
  { id: 'user-5', name: 'Ethan Foster', email: 'ethan.f@bmv.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'user5')?.imageUrl || '', role: 'Funcionário' },
];


export const chatLogForSummary = `
  Brenda Chen para Alex Thompson [10:05 AM]: Oi Alex, enviei a proposta para o Projeto Phoenix. Eles devem analisar até o final do dia de sexta-feira.
  Alex Thompson para Brenda Chen [10:07 AM]: Ótimo, obrigado Brenda. Mantenha-me informado sobre o feedback deles.
  Carlos Diaz para Alex Thompson [2:35 PM]: A negociação com a Global Solutions está esquentando. Eles estão pedindo um desconto de 15%. Acho que podemos chegar a 10%.
  Alex Thompson para Carlos Diaz [2:40 PM]: 10% parece razoável. Vamos formalizar isso. Bom trabalho.
  Diana Evans para Alex Thompson [11:05 AM]: Acabei de ter uma ótima ligação inicial com a MarketBoost. Eles estão muito interessados na plataforma de automação. Agendando uma demonstração para a próxima semana.
  Alex Thompson para Diana Evans [11:10 AM]: Excelentes notícias, Diana! Me avise se precisar de apoio para a demonstração.
`.trim();
