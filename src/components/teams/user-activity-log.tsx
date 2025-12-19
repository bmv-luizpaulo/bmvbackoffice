
'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LogIn, 
  LogOut, 
  User, 
  Lock, 
  UserCheck, 
  Shield,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';
import type { UserActivityLog, User as UserType } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type UserActivityLogProps = {
  user: UserType;
};

export function UserActivityLogComponent({ user }: UserActivityLogProps) {
  const firestore = useFirestore();
  
  const activityQuery = useMemoFirebase(() => {
    if (!firestore || !user.id) return null;
    return query(
      collection(firestore, 'userActivityLogs'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
  }, [firestore, user.id]);

  const { data: activities, isLoading } = useCollection<UserActivityLog>(activityQuery);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'login': return LogIn;
      case 'logout': return LogOut;
      case 'profile_update': return User;
      case 'password_change': return Lock;
      case 'status_change': return UserCheck;
      case 'role_change': return Shield;
      default: return Clock;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'login': return 'text-green-600 bg-green-50 border-green-200';
      case 'logout': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'profile_update': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'password_change': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'status_change': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'role_change': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActivityLabel = (action: string) => {
    switch (action) {
      case 'login': return 'Login';
      case 'logout': return 'Logout';
      case 'profile_update': return 'Perfil Atualizado';
      case 'password_change': return 'Senha Alterada';
      case 'status_change': return 'Status Alterado';
      case 'role_change': return 'Cargo Alterado';
      default: return 'Atividade';
    }
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Data desconhecida';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Atividades Recentes
        </CardTitle>
        <CardDescription>
          Últimas 20 atividades do usuário no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted-foreground/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.action);
                const colorClass = getActivityColor(activity.action);
                const label = getActivityLabel(activity.action);
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-full border ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {activity.timestamp && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(activity.timestamp.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        )}
                        {activity.ipAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.ipAddress}
                          </span>
                        )}
                        {activity.userAgent && (
                          <span className="flex items-center gap-1 truncate">
                            <Monitor className="h-3 w-3" />
                            {activity.userAgent.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma atividade registrada</p>
            <p className="text-sm">As atividades aparecerão aqui conforme o usuário utiliza o sistema</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    