export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
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
  stage: 'Lead' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  lastContact: string;
  contacts: Contact[];
  history: { stage: string; date: string }[];
};

export type Message = {
  id: string;
  sender: User;
  recipient: User;
  text: string;
  timestamp: string;
  read: boolean;
  attachment?: string;
};
