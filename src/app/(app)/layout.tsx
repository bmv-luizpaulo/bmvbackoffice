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
} from 'lucide-react';
import Image from 'next/image';
import { ThemeProvider } from "next-themes";

import {
  SidebarProvider,
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
import { FirebaseClientProvider, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import {
  NotificationsProvider,
} from '@/components/notifications/notifications-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useEffect } from 'react';

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
            { href: '/assets', icon: Building2, label: 'Ativos' },
            { href: '/contracts', icon: Archive, label: 'Contratos' },
            { href: '/checklists', icon: ListChecks, label: 'Checklists' },
        ]
    },
    {
        name: 'Equipe',
        items: [
            { href: '/agenda/tarefas', icon: Calendar, label: 'Agenda' },
            { href: '/chat', icon: MessageSquare, label: 'Chat' },
            { href: '/teams', icon: Users, label: 'Usuários & Equipes' },
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
              <Image src="/image/BMV.png" alt="BMV Logo" width={40} height={40} className="text-primary group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 transition-all" />
            </div>
          </SidebarHeader>
          <SidebarContent>
             <SidebarMenu>
                 {navSections.map((section, index) => (
                    <SidebarGroup key={section.name}>
                        {index > 0 && <SidebarSeparator />}
                        <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
                        {section.items.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href}>
                                    <SidebarMenuButton
                                    isActive={pathname.startsWith(item.href)}
                                    tooltip={item.label}
                                    >
                                    <item.icon />
                                    <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
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
                  <DropdownMenuItem>Faturamento</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        <NotificationsProvider>
          <InnerLayout>{children}</InnerLayout>
        </NotificationsProvider>
      </ThemeProvider>
    </FirebaseClientProvider>
  );
}
