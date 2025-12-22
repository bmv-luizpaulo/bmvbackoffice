
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
  Video,
  List,
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
import { useUser, useAuth, FirebaseClientProvider, useFirebase, usePermissions } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  NotificationsProvider,
} from '@/components/notifications/notifications-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import GlobalErrorBoundary from '@/components/global-error-boundary';

// --- Menu Único para Todos os Usuários ---
const navSections = [
    // --- SEÇÃO GERAL ---
    {
        name: 'Geral',
        items: [
            { href: '/dashboard', icon: BarChart2, label: 'Painel', permission: () => true },
            { href: '/agenda/tarefas', icon: Calendar, label: 'Agenda', permission: () => true },
        ]
    },
    // --- SEÇÃO COMERCIAL ---
    {
        name: 'Comercial',
        permission: (p: any) => p.canManageContacts || p.canManageProductsAndSeals,
        items: [
            { href: '/contatos', icon: BookUser, label: 'Contatos', permission: (p: any) => p.canManageContacts },
            { href: '/selos', icon: Award, label: 'Selos & Produtos', permission: (p: any) => p.canManageProductsAndSeals },
        ]
    },
    // --- SEÇÃO OPERACIONAL ---
    {
        name: 'Operacional',
        permission: () => true,
        items: [
            { 
              href: '/projetos', 
              icon: FolderKanban, 
              label: 'Projetos',
              permission: () => true,
              subItems: [
                 { href: '/projetos', icon: List, label: 'Lista de Projetos', permission: () => true },
                 { href: '/projetos/quadro', icon: KanbanSquare, label: 'Quadro Kanban', permission: () => true },
              ]
            },
            { href: '/reunioes', icon: Video, label: 'Reuniões', permission: (p: any) => p.isManager },
            { href: '/tasks/completed', icon: CheckCircle2, label: 'Tarefas Concluídas', permission: (p: any) => p.isManager },
            { 
              href: '/checklists', 
              icon: ListChecks, 
              label: 'Checklists',
              permission: () => true,
              subItems: [
                { href: '/checklists', icon: ListPlus, label: 'Modelos', permission: (p: any) => p.isManager },
                { href: '/executed-checklists', icon: History, label: 'Executados', permission: () => true },
              ]
            },
        ]
    },
    // --- SEÇÃO GESTÃO DE ATIVOS ---
    {
        name: 'Gestão de Ativos',
        permission: (p: any) => p.canManageAssets,
        items: [
            { href: '/assets', icon: ClipboardList, label: 'Inventário', permission: (p: any) => p.canManageAssets },
            { href: '/maintenance', icon: Wrench, label: 'Manutenções', permission: (p: any) => p.canManageAssets },
            { href: '/asset-contracts', icon: FileText, label: 'Contratos de Uso', permission: (p: any) => p.canManageAssets },
            { href: '/document-templates', icon: FileText, label: 'Modelos de Doc', permission: (p: any) => p.canManageAssets },
        ]
    },
    // --- SEÇÃO FINANCEIRO ---
    {
        name: 'Financeiro',
        permission: (p: any) => p.canAccessFinancial,
        items: [
            { href: '/financeiro', icon: BarChart2, label: 'Painel Financeiro', permission: (p_any) => p.canAccessFinancial },
            { href: '/reembolsos', icon: HandCoins, label: 'Solicitações', permission: (p: any) => p.canAccessFinancial },
            { href: '/cost-centers', icon: Wallet, label: 'Centro de Custos', permission: (p: any) => p.canAccessFinancial },
            { href: '/contracts', icon: Archive, label: 'Contratos Gerais', permission: (p: any) => p.canAccessFinancial },
        ]
    },
    // --- SEÇÃO EQUIPE ---
    {
        name: 'Equipe',
        permission: (p: any) => p.canManageUsers,
        items: [
            { 
              href: '/users', 
              icon: Users, 
              label: 'Usuários & Grupos',
              permission: (p: any) => p.canManageUsers,
              subItems: [
                { href: '/users', icon: User, label: 'Usuários', permission: (p: any) => p.canManageUsers },
                { href: '/teams', icon: Group, label: 'Equipes', permission: (p: any) => p.canManageUsers },
                { href: '/directorates', icon: Building, label: 'Diretorias', permission: (p: any) => p.canManageUsers },
                { href: '/perfis', icon: Shield, label: 'Perfis de Acesso', permission: (p: any) => p.canManageUsers },
              ]
            },
        ]
    },
    // --- SEÇÃO SUPORTE E FERRAMENTAS ---
    {
      name: 'Suporte & Ferramentas',
      permission: () => true,
      items: [
        { href: '/suporte', icon: LifeBuoy, label: 'Suporte', permission: () => true },
        { href: '/dev-tools', icon: Bug, label: 'Ferramentas de Dev', permission: (p: any) => p.isDev, devOnly: true },
      ]
    }
];

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

function NavItem({ item, pathname, permissions }: { item: any, pathname: string, permissions: any }) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  if (item.devOnly && process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  if (item.permission && !item.permission(permissions)) {
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
    !sub.permission || sub.permission(permissions)
  );

  if (visibleSubItems.length === 0) return null;

  return <CollapsibleNavItem item={{ ...item, subItems: visibleSubItems }} pathname={pathname} />;
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useFirebase();
  const permissions = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (pathname === '/') {
      router.replace('/dashboard');
    }
  }, [pathname, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }

  if (isUserLoading || !user) {
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
            <div className="flex h-14 items-center p-2 group-data-[state=expanded]:w-[var(--sidebar-width)] group-data-[state=collapsed]:w-[var(--sidebar-width-icon)] transition-all">
              <Image src="/image/BMV.png" alt="SGI Logo" width={120} height={34} className="group-data-[state=collapsed]:hidden" />
              <Image src="/image/BMV.png" alt="SGI Logo" width={32} height={32} className="hidden group-data-[state=collapsed]:block" />
            </div>
          </SidebarHeader>
          <SidebarContent>
             <SidebarMenu>
                 {navSections.map((section, index) => {
                     const hasVisibleItems = section.items.some(item => {
                         if(item.devOnly && process.env.NODE_ENV !== 'development') return false;
                         return !item.permission || item.permission(permissions);
                     });
                     
                     if (section.permission && !section.permission(permissions) && !hasVisibleItems) {
                         return null;
                     }

                     return (
                        <SidebarGroup key={section.name} className={cn(index === 0 && 'pt-0')}>
                            <SidebarSeparator />
                            <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
                            {section.items.map((item: any) => (
                                <NavItem key={item.label} item={item} pathname={pathname} permissions={permissions} />
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
