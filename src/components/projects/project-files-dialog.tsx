'use client';

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Project, ProjectFile } from "@/lib/types";
import { useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Download, File, Loader2, Trash2, UploadCloud, X } from "lucide-react";

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
  const firestore = useFirestore();
  const { user } = useUser();
  const [isUploading, setIsUploading] = React.useState(false);

  const filesQuery = useMemoFirebase(() => 
    firestore && project ? 
    query(collection(firestore, `projects/${project.id}/files`), orderBy('uploadedAt', 'desc')) 
    : null, 
  [firestore, project]);
  
  const { data: files, isLoading: isLoadingFiles } = useCollection<ProjectFile>(filesQuery);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !user || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    setIsUploading(true);

    try {
      const storage = getStorage();
      const filePath = `projects/${project.id}/${Date.now()}_${file.name}`;
      const fileStorageRef = storageRef(storage, filePath);

      // Upload file
      const snapshot = await uploadBytes(fileStorageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save metadata to Firestore
      const filesCollection = collection(firestore, `projects/${project.id}/files`);
      await addDoc(filesCollection, {
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadedAt: serverTimestamp(),
        uploaderId: user.uid,
      });

      toast({ title: 'Sucesso', description: `Arquivo "${file.name}" enviado.` });
    } catch (error) {
      console.error("File upload error:", error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Não foi possível enviar o arquivo.' });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }


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
            <div className="relative p-6 border-2 border-dashed rounded-lg text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400"/>
                <p className="text-muted-foreground mt-2 mb-4">Arraste e solte arquivos aqui ou clique para selecionar</p>
                <Button asChild variant="outline" disabled={isUploading}>
                    <label htmlFor="file-upload">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Selecionar Arquivo
                    </label>
                </Button>
                <Input id="file-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
            </div>

            <div className="space-y-2">
                <h3 className="font-medium">Arquivos Anexados</h3>
                <div className="border rounded-lg p-2 min-h-[150px]">
                    {isLoadingFiles ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                    ) : files && files.length > 0 ? (
                        <ul className="space-y-2">
                           {files.map(file => (
                             <li key={file.id} className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-muted/50">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <File className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" asChild>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name}>
                                      <Download className="h-5 w-5" />
                                    </a>
                                  </Button>
                                  <Button variant="ghost" size="icon" disabled>
                                      <Trash2 className="h-5 w-5 text-destructive/70" />
                                  </Button>
                                </div>
                             </li>
                           ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-muted-foreground text-sm">Nenhum arquivo encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
