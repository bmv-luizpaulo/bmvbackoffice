import type { Opportunity, User, Message } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const STAGES = ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;

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
    title: 'Project Phoenix Deployment',
    company: 'Innovate Inc.',
    value: 75000,
    stage: 'Proposal',
    lastContact: '2024-05-20T10:00:00Z',
    contacts: [{ id: 'cont-1', name: 'John Doe', role: 'CTO', email: 'john.doe@innovate.com' }],
    history: [
      { stage: 'Lead', date: '2024-04-01' },
      { stage: 'Qualification', date: '2024-04-15' },
      { stage: 'Proposal', date: '2024-05-10' },
    ],
  },
  {
    id: 'opp-002',
    title: 'Enterprise Software Suite',
    company: 'Global Solutions Ltd.',
    value: 120000,
    stage: 'Negotiation',
    lastContact: '2024-05-22T14:30:00Z',
    contacts: [{ id: 'cont-2', name: 'Jane Smith', role: 'Procurement Director', email: 'jane.smith@globalsolutions.com' }],
    history: [
      { stage: 'Lead', date: '2024-03-10' },
      { stage: 'Qualification', date: '2024-03-25' },
      { stage: 'Proposal', date: '2024-04-20' },
      { stage: 'Negotiation', date: '2024-05-18' },
    ],
  },
  {
    id: 'opp-003',
    title: 'Cloud Migration Strategy',
    company: 'NextGen Corp.',
    value: 45000,
    stage: 'Qualification',
    lastContact: '2024-05-18T09:00:00Z',
    contacts: [{ id: 'cont-3', name: 'Peter Jones', role: 'IT Manager', email: 'peter.jones@nextgen.com' }],
    history: [{ stage: 'Lead', date: '2024-05-05' }, { stage: 'Qualification', date: '2024-05-15' }],
  },
  {
    id: 'opp-004',
    title: 'Marketing Automation Platform',
    company: 'MarketBoost',
    value: 30000,
    stage: 'Lead',
    lastContact: '2024-05-23T11:00:00Z',
    contacts: [{ id: 'cont-4', name: 'Susan Miller', role: 'Marketing Head', email: 'susan.m@marketboost.com' }],
    history: [{ stage: 'Lead', date: '2024-05-23' }],
  },
  {
    id: 'opp-005',
    title: 'HR Management System',
    company: 'PeopleFirst Inc.',
    value: 60000,
    stage: 'Won',
    lastContact: '2024-05-15T16:00:00Z',
    contacts: [{ id: 'cont-5', name: 'Michael Brown', role: 'HR Director', email: 'michael.b@peoplefirst.com' }],
    history: [
      { stage: 'Lead', date: '2024-02-01' },
      { stage: 'Qualification', date: '2024-02-20' },
      { stage: 'Proposal', date: '2024-03-15' },
      { stage: 'Negotiation', date: '2024-04-10' },
      { stage: 'Won', date: '2024-05-15' },
    ],
  },
  {
    id: 'opp-006',
    title: 'Cybersecurity Audit',
    company: 'SecureNet',
    value: 25000,
    stage: 'Lost',
    lastContact: '2024-04-30T12:00:00Z',
    contacts: [{ id: 'cont-6', name: 'Karen White', role: 'CISO', email: 'karen.w@securenet.com' }],
    history: [
      { stage: 'Lead', date: '2024-03-01' },
      { stage: 'Qualification', date: '2024-03-18' },
      { stage: 'Proposal', date: '2024-04-05' },
      { stage: 'Lost', date: '2024-04-30' },
    ],
  },
  {
    id: 'opp-007',
    title: 'Logistics Optimization AI',
    company: 'QuickShip Co.',
    value: 250000,
    stage: 'Negotiation',
    lastContact: '2024-05-24T15:00:00Z',
    contacts: [{ id: 'cont-7', name: 'David Wilson', role: 'COO', email: 'david.w@quickship.com' }],
    history: [
      { stage: 'Lead', date: '2024-04-10' },
      { stage: 'Qualification', date: '2024-04-25' },
      { stage: 'Proposal', date: '2024-05-12' },
      { stage: 'Negotiation', date: '2024-05-22' },
    ],
  },
  {
    id: 'opp-008',
    title: 'BI Dashboard Implementation',
    company: 'DataDriven Insights',
    value: 85000,
    stage: 'Proposal',
    lastContact: '2024-05-19T17:00:00Z',
    contacts: [{ id: 'cont-8', name: 'Laura Green', role: 'Analytics Lead', email: 'laura.g@datadriven.com' }],
    history: [
        { stage: 'Lead', date: '2024-04-05' },
        { stage: 'Qualification', date: '2024-04-20' },
        { stage: 'Proposal', date: '2024-05-08' },
    ],
  },
];

export const messages: Message[] = [
  {
    id: 'msg-1',
    sender: users[1], // Brenda
    recipient: users[0], // Alex
    text: "Hey Alex, I've sent the proposal for Project Phoenix. They should review it by EOD Friday.",
    timestamp: '2024-05-20T10:05:00Z',
    read: true,
  },
  {
    id: 'msg-2',
    sender: users[0], // Alex
    recipient: users[1], // Brenda
    text: "Great, thanks Brenda. Keep me posted on their feedback.",
    timestamp: '2024-05-20T10:07:00Z',
    read: true,
  },
  {
    id: 'msg-3',
    sender: users[2], // Carlos
    recipient: users[0], // Alex
    text: "The negotiation with Global Solutions is heating up. They're asking for a 15% discount. I think we can meet them at 10%.",
    timestamp: '2024-05-22T14:35:00Z',
    read: true,
  },
  {
    id: 'msg-4',
    sender: users[0], // Alex
    recipient: users[2], // Carlos
    text: "10% sounds reasonable. Let's get it in writing. Good work.",
    timestamp: '2024-05-22T14:40:00Z',
    read: false,
  },
    {
    id: 'msg-5',
    sender: users[3], // Diana
    recipient: users[0], // Alex
    text: "Just had a great initial call with MarketBoost. They're very interested in the automation platform. Scheduling a demo for next week.",
    timestamp: '2024-05-23T11:05:00Z',
    read: true,
  },
  {
    id: 'msg-6',
    sender: users[0], // Alex
    recipient: users[3], // Diana
    text: "Excellent news, Diana! Let me know if you need support for the demo.",
    timestamp: '2024-05-23T11:10:00Z',
    read: false,
  },
];

export const chatLogForSummary = messages
  .map(m => `${m.sender.name} to ${m.recipient.name} [${new Date(m.timestamp).toLocaleTimeString()}]: ${m.text}`)
  .join('\n');
