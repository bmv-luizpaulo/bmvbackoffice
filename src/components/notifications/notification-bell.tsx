'use client';

import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotifications } from './notifications-provider';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full"
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 md:w-96">
        <header className="flex items-center justify-between border-b p-3">
          <h3 className="font-semibold">Notificações</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Marcar todas como lidas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link}
                  passHref
                  legacyBehavior
                >
                  <a
                    className={cn(
                      'block border-b p-3 text-sm transition-colors hover:bg-muted/50',
                      !notification.isRead && 'bg-primary/5'
                    )}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-semibold">{notification.title}</p>
                      {!notification.isRead && (
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString(
                        'pt-BR',
                        {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
