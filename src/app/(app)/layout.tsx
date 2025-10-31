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
import { useUser, useAuth } from '@/firebase';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { signOut } from 'firebase/auth';
import {
  NotificationsProvider,
} from '@/components/notifications/notifications-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const navSections = [
    {
        name: 'Geral',
        items: [
            { href: '/dashboard', icon: BarChart2, label: 'Painel' },
        ]
    },
    {
        name: 'Comercial',
        items: [
            { href: '/contatos', icon: BookUser, label: 'Contatos' },
            { href: '/selos', icon: Award, label: 'Selos' },
        ]
    },
    {
        name: 'Operacional',
        items: [
            { href: '/projects', icon: ListChecks, label: 'Tarefas' },
            { 
              href: '/assets', 
              icon: Building2, 
              label: 'Ativos',
              subItems: [
                { href: '/maintenance', icon: Wrench, label: 'Manutenções' },
                { href: '/contracts', icon: Archive, label: 'Contratos' },
                { href: '/reports', icon: FileText, label: 'Relatórios' },
              ]
            },
            { href: '/checklists', icon: ListChecks, label: 'Checklists' },
        ]
    },
    {
        name: 'Equipe',
        items: [
            { href: '/agenda/tarefas', icon: Calendar, label: 'Agenda' },
            { href: '/chat', icon: MessageSquare, label: 'Chat' },
            { 
              href: '#', 
              icon: Users, 
              label: 'Usuários & Grupos',
              subItems: [
                { href: '/users', icon: User, label: 'Usuários' },
                { href: '/teams', icon: Group, label: 'Equipes' },
                { href: '/roles', icon: Briefcase, label: 'Cargos' },
              ]
            },
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

function NavItem({ item, pathname }: { item: (typeof navSections)[0]['items'][0] & { subItems?: any[] }, pathname: string }) {
  const { state } = useSidebar();
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  const isParentActive = hasSubItems
    ? item.subItems.some(sub => pathname.startsWith(sub.href))
    : pathname.startsWith(item.href);

  const [isOpen, setIsOpen] = React.useState(isParentActive);

  React.useEffect(() => {
      setIsOpen(isParentActive);
  }, [isParentActive]);
  
  useEffect(() => {
    if (state === 'collapsed') {
      setIsOpen(false);
    }
  }, [state]);
  
  const isDummyLink = item.href === '#';

  if (!hasSubItems) {
    return (
      <SidebarMenuItem>
        <Link href={item.href}>
          <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={item.label}>
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  }

  return (
     <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
        <CollapsibleTrigger asChild>
            <SidebarMenuButton
                isActive={isParentActive}
                tooltip={item.label}
                className="justify-between"
                disabled={isDummyLink}
            >
                <div className='flex items-center gap-2'>
                    <item.icon />
                    <span>{item.label}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
             <SidebarMenuSub>
                {item.subItems?.map(subItem => (
                     <SidebarMenuItem key={subItem.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith(subItem.href)}
                        >
                          <Link href={subItem.href}>
                            <subItem.icon />
                            <span>{subItem.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenuSub>
        </CollapsibleContent>
     </Collapsible>
  )
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // O onAuthStateChanged no provider cuidará do redirecionamento
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
            <div className="flex items-center justify-center p-2">
              <Image src="/image/BMV.png" alt="BMV Logo" width={120} height={40} className="text-primary group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 transition-all" />
            </div>
          </SidebarHeader>
          <SidebarContent>
             <SidebarMenu>
                 {navSections.map((section, index) => (
                    <SidebarGroup key={section.name}>
                        {index > 0 && <SidebarSeparator />}
                        <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
                        {section.items.map((item) => (
                           <NavItem key={item.href} item={item as any} pathname={pathname} />
                        ))}
                    </SidebarGroup>
                ))}
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
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:justify-end">
            <SidebarTrigger className="sm:hidden" />
            <div className='flex items-center gap-4'>
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
            {children}
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
