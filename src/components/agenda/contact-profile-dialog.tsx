'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Building,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { Contact } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContactProfileDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact | null;
};

export function ContactProfileDialog({ isOpen, onOpenChange, contact }: ContactProfileDialogProps) {
  if (!contact) return null;
  
  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const authConfig = {
    'Verificado': { label: 'Verificado', icon: CheckCircle2, className: 'text-green-600' },
    'Não verificado': { label: 'Não Verificado', icon: AlertCircle, className: 'text-amber-600' },
    'Pendente': { label: 'Pendente', icon: Clock, className: 'text-gray-600' }
  };
  const currentAuthConfig = authConfig[contact.autenticacao] || authConfig['Pendente'];
  const AuthIcon = currentAuthConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
             <Avatar className="h-16 w-16 text-xl">
                <AvatarImage src={undefined} alt={fullName} />
                <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-muted-foreground">{contact.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{contact.tipo}</Badge>
                <Badge variant="secondary">{contact.situacao}</Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Informações de Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                 <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                 {contact.celular && <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.celular} (Celular)</span>
                  </div>}
                 {contact.telefone && <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.telefone} (Telefone)</span>
                  </div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5" />
                  Informações Fiscais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                 <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.tipoDocumento}: {contact.documento}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AuthIcon className={`h-4 w-4 ${currentAuthConfig.className}`} />
                    <span>Autenticação: {contact.autenticacao}</span>
                  </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Endereço
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                    <p>{contact.address.rua}, {contact.address.numero}{contact.address.complemento ? `, ${contact.address.complemento}` : ''}</p>
                    <p>{contact.address.bairro}</p>
                    <p>{contact.address.cidade} - {contact.address.pais}</p>
                    <p>CEP: {contact.address.cep}</p>
                </CardContent>
                </Card>
            </div>
        </div>

        <Separator />
        
        <div className="text-xs text-muted-foreground text-center">
            Contato criado em {contact.createdAt ? format(new Date(contact.createdAt.toDate()), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data desconhecida'}
        </div>

      </DialogContent>
    </Dialog>
  );
}
