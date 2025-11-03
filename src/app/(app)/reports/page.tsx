'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from 'firebase/firestore';
import type { Asset, User } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export default function ReportsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  
  const [selectedReportType, setSelectedReportType] = React.useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
  
  const assignedAssetsQuery = useMemoFirebase(() => 
    firestore 
      ? query(collection(firestore, 'assets'), where('assigneeId', '!=', null)) 
      : null, 
  [firestore]);

  const { data: assets, isLoading: isLoadingAssets } = useCollection<Asset>(assignedAssetsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const usersMap = React.useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);
  
  const handleGenerateReport = () => {
    if (!selectedReportType || !selectedAssetId) return;

    if (selectedReportType === 'asset-delivery') {
      window.open(`/reports/asset-delivery/${selectedAssetId}`, '_blank');
    }
  };

  const isLoading = isLoadingAssets || isLoadingUsers;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Central de Relatórios
        </h1>
        <p className="text-muted-foreground">
          Gere e visualize relatórios importantes para a gestão.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gerador de Relatórios</CardTitle>
          <CardDescription>
            Selecione o tipo de relatório e os parâmetros necessários para gerá-lo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="report-type">Tipo de Relatório</Label>
            <Select onValueChange={setSelectedReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Selecione o tipo de relatório..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset-delivery">Termo de Entrega de Ativo</SelectItem>
                <SelectItem value="asset-return" disabled>Termo de Devolução de Ativo (Em breve)</SelectItem>
                <SelectItem value="promissory-note" disabled>Nota Promissória (Em breve)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && selectedReportType && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando dados...</span>
            </div>
          )}

          {selectedReportType === 'asset-delivery' && !isLoading && (
            <div className="space-y-2">
              <Label htmlFor="asset-select">Selecione o Ativo</Label>
              <Select onValueChange={setSelectedAssetId}>
                <SelectTrigger id="asset-select">
                  <SelectValue placeholder="Selecione um ativo atribuído..." />
                </SelectTrigger>
                <SelectContent>
                  {assets && assets.length > 0 ? (
                    assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} (Responsável: {usersMap.get(asset.assigneeId!) || 'Desconhecido'})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum ativo atribuído a um usuário encontrado.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end">
             <Button
                onClick={handleGenerateReport}
                disabled={!selectedReportType || !selectedAssetId}
              >
                Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
