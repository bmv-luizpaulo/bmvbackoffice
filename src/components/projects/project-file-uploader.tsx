'use client';

import * as React from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';

interface ProjectFileUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export function ProjectFileUploader({ onFileUpload, isUploading }: ProjectFileUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onFileUpload(file);
    }
    // Reset file input to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await onFileUpload(file);
    } else {
        toast({
            variant: 'destructive',
            title: 'Arquivo inválido',
            description: 'Por favor, arraste um arquivo válido.',
        });
    }
  };

  return (
    <div
      className="relative p-6 border-2 border-dashed rounded-lg text-center"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
      <p className="text-muted-foreground mt-2 mb-4">Arraste e solte arquivos aqui ou clique para selecionar</p>
      <Button asChild variant="outline" disabled={isUploading}>
        <label htmlFor="file-upload">
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Selecionar Arquivo
        </label>
      </Button>
      <Input
        id="file-upload"
        type="file"
        ref={fileInputRef}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  );
}
