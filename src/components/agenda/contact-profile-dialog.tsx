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
  Clock,
  MoreVertical,
  ChevronDown,
  Pencil
} from 'lucide-react';
import type { Contact } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { WhatsappIcon } from "../icons/whatsapp-icon";

type ContactProfileDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact | null;
  onUpdate?: (contactId: string, updates: Partial<Contact>) => void;
  onEdit?: (contact: Contact) => void;
};

export function ContactProfileDialog({ isOpen, onOpenChange, contact, onUpdate, onEdit }: ContactProfileDialogProps) {
  const { toast } = useToast();

  if (!contact) return null;
  
  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();

  const handleUpdate = (updates: Partial<Contact>) => {
    if (onUpdate) {
      onUpdate(contact.id, updates);
      toast({
        title: "Contato Atualizado",
        description: "As informações do contato foram salvas.",
      });
    }
  };

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

  const getCreatedAtDate = (createdAt: any): Date | null => {
    if (!createdAt) return null;
    if (createdAt.toDate) return createdAt.toDate();
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
  };
  const createdAtDate = getCreatedAtDate(contact.createdAt);
  
  const cleanPhone = (phone?: string) => phone?.replace(/\D/g, '') || '';
  const celular = cleanPhone(contact.celular);
  const telefone = cleanPhone(contact.telefone);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
             <div className="flex items-center gap-4">
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
             </div>
             {(onUpdate || onEdit) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                        {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(contact)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar Contato
                            </DropdownMenuItem>
                        )}
                        {onUpdate && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Alterar Tipo</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuRadioGroup value={contact.tipo} onValueChange={(value) => handleUpdate({ tipo: value as any })}>
                                        <DropdownMenuRadioItem value="cliente">Cliente</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="fornecedor">Fornecedor</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="parceiro">Parceiro</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Alterar Situação</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup value={contact.situacao} onValueChange={(value) => handleUpdate({ situacao: value as any })}>
                                        <DropdownMenuRadioItem value="Ativo">Ativo</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="Inativo">Inativo</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="Bloqueado">Bloqueado</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
             )}
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
                 <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    <a href={`mailto:${contact.email}`}><Button variant="outline" size="sm">Email</Button></a>
                  </div>
                 {contact.celular && <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.celular} (Celular)</span>
                    </div>
                    <div className="flex gap-1">
                      <a href={`https://wa.me/55${celular}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="icon" className="h-8 w-8"><WhatsappIcon className="h-4 w-4"/></Button></a>
                      <a href={`tel:${celular}`}><Button variant="outline" size="icon" className="h-8 w-8"><Phone className="h-4 w-4"/></Button></a>
                    </div>
                  </div>}
                 {contact.telefone && <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.telefone} (Telefone)</span>
                    </div>
                    <a href={`tel:${telefone}`}><Button variant="outline" size="sm">Ligar</Button></a>
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
            Contato criado em {createdAtDate ? format(createdAtDate, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data desconhecida'}
        </div>

      </DialogContent>
    </Dialog>
  );
}
