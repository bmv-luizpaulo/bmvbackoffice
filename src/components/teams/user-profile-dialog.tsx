'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Users, 
  Calendar,
  Shield,
  ExternalLink,
  UserCheck,
  UserX,
  UserMinus
} from 'lucide-react';
import type { User as UserType, Role, Team } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserActivityLogComponent } from './user-activity-log';

type UserProfileDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: UserType | null;
};

export function UserProfileDialog({ isOpen, onOpenChange, user }: UserProfileDialogProps) {
  const firestore = useFirestore();
  
  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: rolesData } = useCollection<Role>(rolesQuery);
  const rolesMap = React.useMemo(() => new Map(rolesData?.map(r => [r.id, r])), [rolesData]);

  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData } = useCollection<Team>(teamsQuery);
  const teamsMap = React.useMemo(() => new Map(teamsData?.map(t => [t.id, t])), [teamsData]);

  if (!user) return null;

  const userRole = user.roleId ? rolesMap.get(user.roleId) : null;
  const userTeams = user.teamIds?.map(teamId => teamsMap.get(teamId)).filter(Boolean) || [];
  
  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const statusConfig = {
    active: { label: 'Ativo', icon: UserCheck, className: 'text-green-600 bg-green-50 border-green-200' },
    inactive: { label: 'Inativo', icon: UserX, className: 'text-gray-600 bg-gray-50 border-gray-200' },
    suspended: { label: 'Suspenso', icon: UserMinus, className: 'text-red-600 bg-red-50 border-red-200' }
  };

  const status = user.status || 'active';
  const StatusIcon = statusConfig[status].icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription>Perfil detalhado e atividades do usuário.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Básicas */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.phone}</span>
                    </div>
                  )}
                  {user.personalDocument && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">CPF:</span>
                      <span className="text-sm">{user.personalDocument}</span>
                    </div>
                  )}
                  {user.linkedinUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={user.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
                
                {user.address && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereço
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {user.address.street && (
                          <p>{user.address.street}, {user.address.number} {user.address.complement}</p>
                        )}
                        {user.address.neighborhood && (
                          <p>{user.address.neighborhood}</p>
                        )}
                        {user.address.city && (
                          <p>{user.address.city} - {user.address.state}</p>
                        )}
                        {user.address.zipCode && (
                          <p>CEP: {user.address.zipCode}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Equipes */}
            {userTeams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Equipes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {userTeams.map(team => (
                      <Badge key={team?.id} variant="secondary">
                        {team?.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar com Status e Cargo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border mt-1 ${statusConfig[status].className}`}>
                    <StatusIcon className="h-4 w-4" />
                    {statusConfig[status].label}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Cargo</label>
                  <div className="mt-1">
                    {userRole ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={userRole.permissions?.isManager ? "default" : "secondary"}>
                          {userRole.permissions?.isManager && <Shield className="h-3 w-3 mr-1" />}
                          {userRole.name}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Não definido</span>
                    )}
                  </div>
                </div>

                {user.createdAt && (
                  <div>
                    <label className="text-sm font-medium">Membro desde</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(user.createdAt.toDate()), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )}

                {user.lastLoginAt && (
                  <div>
                    <label className="text-sm font-medium">Último acesso</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(user.lastLoginAt.toDate()), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Equipes</span>
                  <span className="text-sm font-medium">{userTeams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Perfil</span>
                  <span className="text-sm font-medium">
                    {user.phone && user.address?.city ? 'Completo' : 'Incompleto'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Log de Atividades - Seção completa */}
        <div className="mt-6">
          <UserActivityLogComponent user={user} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
