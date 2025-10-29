'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ProjectFilesDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  project: Project | null;
};

export function ProjectFilesDialog({ isOpen, onOpenChange, project }: ProjectFilesDialogProps) {
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    toast({ title: 'A fazer', description: `Lógica de upload para o arquivo ${file.name}` });
    // Lógica de upload aqui
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Arquivos do Projeto: {project?.name}</DialogTitle>
          <DialogDescription>
            Gerencie os documentos e arquivos associados a este projeto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <p className="text-muted-foreground mb-2">Arraste e solte arquivos aqui ou clique para selecionar</p>
                <Button asChild variant="outline">
                    <label htmlFor="file-upload">
                        Selecionar Arquivo
                    </label>
                </Button>
                <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="space-y-2">
                <h3 className="font-medium">Arquivos Anexados</h3>
                <div className="border rounded-lg p-4 min-h-[150px] flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Nenhum arquivo encontrado.</p>
                </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
