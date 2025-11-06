'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import type { User, Asset } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { FileText, Search, XCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function AssetContractsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const contractsQuery = useMemoFirebase(() => (firestore && user)
    ? query(collection(firestore, 'assetUsageContracts'), orderBy('createdAt', 'desc'))
    : null,
  [firestore, user]);
  const { data: contracts, isLoading: isLoadingContracts } = useCollection<any>(contractsQuery);

  const usersQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users') : null, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const assetsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'assets') : null, [firestore, user]);
  const { data: assets, isLoading: isLoadingAssets } = useCollection<Asset>(assetsQuery);

  const usersMap = React.useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);
  const assetsMap = React.useMemo(() => new Map(assets?.map(a => [a.id, a.name])), [assets]);

  const [textFilter, setTextFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'Todos'|'Ativo'|'Encerrado'>('Todos');

  const filtered = React.useMemo(() => {
    const list = contracts || [];
    return list.filter((c: any) => {
      const statusOk = statusFilter === 'Todos' ? true : c.status === statusFilter;
      const q = textFilter.trim().toLowerCase();
      const txtOk = !q || (c.assetName || '').toLowerCase().includes(q) || (usersMap.get(c.userId || '') || '').toLowerCase().includes(q);
      return statusOk && txtOk;
    });
  }, [contracts, statusFilter, textFilter, usersMap]);

  const isLoading = isLoadingContracts || isLoadingUsers || isLoadingAssets;

  const handleClose = async (id: string) => {
    if (!firestore) return;
    const ok = window.confirm('Encerrar este contrato e registrar devolução do ativo?');
    if (!ok) return;

    const contract = (contracts || []).find((c: any) => c.id === id);
    if (!contract) {
      await updateDocumentNonBlocking(doc(firestore, 'assetUsageContracts', id), { status: 'Encerrado', endDate: new Date().toISOString() });
      return;
    }

    // 1) Encerrar contrato
    updateDocumentNonBlocking(doc(firestore, 'assetUsageContracts', id), { status: 'Encerrado', endDate: new Date().toISOString() });

    // 2) Anexo II – Termo de Devolução
    const assetName = assetsMap.get(contract.assetId) || contract.assetName || contract.assetId;
    const userName = usersMap.get(contract.userId) || contract.userId;
    const returnContent = `Devolução do ${assetName} pelo usuário ${userName} em ${new Date().toLocaleDateString('pt-BR')}.`;
    await addDocumentNonBlocking(collection(firestore, `assetUsageContracts/${id}/annexes`), {
      type: 'return_term',
      content: returnContent,
      createdAt: new Date().toISOString(),
    } as any);

    // 3) Desvincular ativo
    if (contract.assetId) {
      updateDocumentNonBlocking(doc(firestore, 'assets', contract.assetId), {
        assigneeId: null,
        status: 'Em estoque',
        currentContractId: null,
        updatedAt: new Date().toISOString(),
      });

      // 4) Histórico do ativo
      await addDocumentNonBlocking(collection(firestore, `assets/${contract.assetId}/history`), {
        type: 'contract_closed',
        message: `Contrato ${id} encerrado e ativo devolvido por ${userName}.`,
        contractId: id,
        userId: contract.userId,
        createdAt: new Date().toISOString(),
      } as any);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Contratos de Uso de Ativos</h1>
        <p className="text-muted-foreground">Gerencie contratos, gere relatórios e encerre instrumentos conforme necessário.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>Lista de contratos ativos e encerrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por usuário ou ativo..." className="pl-8" value={textFilter} onChange={(e) => setTextFilter(e.target.value)} />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Encerrado">Encerrado</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/assets">
                <Button variant="outline"><Plus className="h-4 w-4 mr-2"/>Novo Contrato</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            {isLoading ? (
              <div className="p-6"><Skeleton className="h-6 w-full" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.assetName || assetsMap.get(c.assetId) || '—'}</TableCell>
                      <TableCell>{usersMap.get(c.userId || '') || c.userId || '—'}</TableCell>
                      <TableCell>{c.startDate ? format(new Date(c.startDate), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell>{c.endDate ? format(new Date(c.endDate), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell>{c.status || '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/reports/usage-contract/${c.id}`}><Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-2"/>Ver</Button></Link>
                        {c.status !== 'Encerrado' && (
                          <Button size="sm" variant="outline" onClick={() => handleClose(c.id)}><XCircle className="h-4 w-4 mr-2"/>Encerrar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum contrato encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
