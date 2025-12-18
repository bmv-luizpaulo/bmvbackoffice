
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart2,
  Users,
  MessageSquare,
  Settings,
  BookUser,
  Calendar,
  Archive,
  ListChecks,
  Building2,
  Award,
  FileText,
  Wrench,
  ChevronDown,
  User,
  Group,
  Briefcase,
  KanbanSquare,
  CheckCircle2,
  Package,
  Building,
  ListPlus,
  HandCoins,
  Wallet,
  ClipboardList,
  MessagesSquare,
  FolderPlus,
  History,
  FolderKanban,
  LifeBuoy,
  Hammer,
  UserSquare,
  Bug,
  Shield,
} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect } from 'react';

import {
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar-provider';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useAuth, FirebaseClientProvider, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  NotificationsProvider,
} from '@/components/notifications/notifications-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { doc } from 'firebase/firestore';
import type { User as UserType, Role } from '@/lib/types';
import { useFirestore } from '@/firebase';
import GlobalErrorBoundary from '@/components/global-error-boundary';

const navSections = [
    {
        name: 'Geral',
        items: [
            { href: '/dashboard', icon: BarChart2, label: 'Painel' },
            { href: '/agenda/tarefas', icon: Calendar, label: 'Agenda' },
        ]
    },
    {
        name: 'Minha Área',
        items: [
            { href: '/projetos?filter=me', icon: FolderKanban, label: 'Meus Projetos' },
            { href: '/assets?owner=me', icon: UserSquare, label: 'Meus Ativos' },
            { href: '/checklists?filter=me', icon: ListChecks, label: 'Meus Checklists' },
            { href: '/meus-reembolsos', icon: HandCoins, label: 'Meus Reembolsos' },
        ]
    },
    {
        name: 'Comercial',
        items: [
            { href: '/contatos', icon: BookUser, label: 'Contatos' },
            { 
              href: '#', 
              icon: Package, 
              label: 'Produtos',
              subItems: [
                { href: '/products', icon: Package, label: 'Todos os Produtos' },
                { href: '/selos', icon: Award, label: 'Gestão de Selos' },
              ]
            },
        ]
    },
    {
        name: 'Operacional',
        items: [
            { 
              href: '#', 
              icon: FolderKanban, 
              label: 'Projetos',
              subItems: [
                 { href: '/projetos', icon: FolderKanban, label: 'Lista de Projetos' },
                 { href: '/projects', icon: KanbanSquare, label: 'Quadro Kanban' },
              ]
            },
            { href: '/tasks/completed', icon: CheckCircle2, label: 'Tarefas Concluídas' },
            { 
              href: '#', 
              icon: ListChecks, 
              label: 'Gestão de Checklists',
              subItems: [
                { href: '/checklists', icon: ListPlus, label: 'Gerenciar Checklists' },
                { href: '/executed-checklists', icon: History, label: 'Checklists Realizados' },
              ]
            },
        ]
    },
    {
        name: 'Gestão de Ativos',
        items: [
            { href: '/assets', icon: ClipboardList, label: 'Todos os Ativos' },
            { href: '/maintenance', icon: Wrench, label: 'Manutenções' },
            { href: '/asset-contracts', icon: FileText, label: 'Contratos de Uso' },
            { href: '/document-templates', icon: FileText, label: 'Modelos de Docs' },
        ]
    },
    {
        name: 'Financeiro',
        items: [
            { href: '/financeiro', icon: BarChart2, label: 'Painel Financeiro' },
            { href: '/reembolsos', icon: HandCoins, label: 'Solicitações' },
            { href: '/cost-centers', icon: Wallet, label: 'Centro de Custos' },
            { href: '/contracts', icon: Archive, label: 'Contratos Gerais' },
        ]
    },
    {
        name: 'Equipe',
        items: [
            { 
              href: '#', 
              icon: Users, 
              label: 'Usuários & Grupos',
              subItems: [
                { href: '/users', icon: User, label: 'Usuários' },
                { href: '/teams', icon: Users, label: 'Equipes' },
                { href: '/directorates', icon: Building, label: 'Diretorias' },
                { href: '/perfis', icon: Shield, label: 'Perfis de Acesso' },
              ]
            },
        ]
    },
    {
      name: 'Suporte & Ferramentas',
      items: [
        { href: '/suporte', icon: LifeBuoy, label: 'Suporte' },
        { href: '/dev-tools', icon: Bug, label: 'Ferramentas de Dev', devOnly: true },
      ]
    }
]


function UserAvatar() {
    const { user } = useUser();

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL || undefined} alt="User Avatar" />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
        </Avatar>
    );
}

const CollapsibleNavItem = ({ item, pathname }: { item: any, pathname: string }) => {
    const { state } = useSidebar();
    const isParentActive = item.subItems.some((sub: any) => pathname.startsWith(sub.href.split('?')[0]));

    const [isOpen, setIsOpen] = React.useState(isParentActive);

    React.useEffect(() => {
        if (!isParentActive && state === 'expanded') {
            // Don't close on navigation away if it's a collapsible parent
        } else {
            setIsOpen(isParentActive);
        }
    }, [isParentActive, state]);

    useEffect(() => {
        if (state === 'collapsed') {
            setIsOpen(false);
        }
    }, [state]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
            <CollapsibleTrigger asChild>
                <SidebarMenuButton
                    isActive={isParentActive}
                    tooltip={item.label}
                    className="justify-between"
                >
                    <div className='flex items-center gap-2'>
                        <item.icon />
                        <span>{item.label}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <SidebarMenuSub>
                    {item.subItems?.map((subItem: any) => (
                        <SidebarMenuItem key={subItem.href}>
                            <SidebarMenuSubButton
                                href={subItem.href}
                                isActive={pathname.startsWith(subItem.href.split('?')[0])}
                            >
                                <subItem.icon />
                                <span>{subItem.label}</span>
                            </SidebarMenuSubButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenuSub>
            </CollapsibleContent>
        </Collapsible>
    );
};

function NavItem({ item, pathname, isManager, isDev }: { item: any, pathname: string, isManager: boolean, isDev: boolean }) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  if (item.devOnly && process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (item.managerOnly && !isManager && !isDev) {
    return null;
  }
  
  if (!hasSubItems) {
    return (
      <SidebarMenuItem>
        <Link href={item.href}>
          <SidebarMenuButton isActive={pathname.startsWith(item.href.split('?')[0])} tooltip={item.label}>
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  }

  const visibleSubItems = item.subItems.filter((sub: any) => 
    (!sub.managerOnly || isManager || isDev) && 
    (!sub.devOnly || isDev)
  );

  if (visibleSubItems.length === 0) return null;

  return <CollapsibleNavItem item={{ ...item, subItems: visibleSubItems }} pathname={pathname} />;
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocQuery = useMemoFirebase(() => (firestore && user?.uid) ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserType>(userDocQuery);

  const roleDocQuery = useMemoFirebase(() => (firestore && userProfile?.roleId) ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: roleData, isLoading: isLoadingRole } = useDoc<Role>(roleDocQuery);
  
  const isManager = !!roleData?.permissions?.isManager;
  const isDev = !!roleData?.permissions?.isDev;

  const isLoadingPermissions = isUserLoading || isLoadingProfile || isLoadingRole;

  useEffect(() => {
    if (!isLoadingPermissions && !user) {
      router.replace('/login');
    }
  }, [user, isLoadingPermissions, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }

  if (isLoadingPermissions || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
            <svg
                className="h-8 w-8 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                ></circle>
                <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>
            <p className="text-muted-foreground">Carregando...</p>
            </div>
        </div>
        );
  }
  
  return (
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex h-14 items-center justify-center p-2 group-data-[state=expanded]:w-[var(--sidebar-width)] group-data-[state=collapsed]:w-[var(--sidebar-width-icon)] transition-all">
              <Image src="/image/BMV.png" alt="BMV Logo" width={120} height={40} className="group-data-[state=collapsed]:hidden" />
              <Image src="/image/BMV.png" alt="BMV Logo" width={32} height={32} className="hidden group-data-[state=collapsed]:block" />
            </div>
          </SidebarHeader>
          <SidebarContent>
             <SidebarMenu>
                 {navSections.map((section, index) => {
                    const visibleItems = section.items.filter((item: any) => 
                      (!item.managerOnly || isManager || isDev) && 
                      (!item.devOnly || process.env.NODE_ENV === 'development')
                    );
                    if (!visibleItems.length) return null;
                    
                    return (
                      <SidebarGroup key={section.name} className={cn(index === 0 && 'pt-0')}>
                        <SidebarSeparator />
                        <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
                        {visibleItems.map((item: any) => (
                           <NavItem key={item.label} item={item} pathname={pathname} isManager={isManager} isDev={isDev} />
                        ))}
                      </SidebarGroup>
                    );
                 })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                  <Link href="/settings">
                    <SidebarMenuButton
                      isActive={pathname === '/settings'}
                      tooltip="Configurações"
                    >
                      <Settings />
                      <span>Configurações</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:justify-end">
            <SidebarTrigger className="sm:hidden" />
            <div className='flex flex-1 items-center justify-end gap-4'>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <UserAvatar />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem>Perfil</DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <FirebaseErrorListener />
            <GlobalErrorBoundary>
              {children}
            </GlobalErrorBoundary>
          </main>
        </SidebarInset>
      </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <NotificationsProvider>
        <InnerLayout>{children}</InnerLayout>
      </NotificationsProvider>
    </FirebaseClientProvider>
  );
}
