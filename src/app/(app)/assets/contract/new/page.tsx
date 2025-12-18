'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Asset, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function NewUsageContractPage() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId') || '';
  const firestore = useFirestore();
  const router = useRouter();
  const { user: authUser } = useUser();

  const assetDocQuery = useMemoFirebase(() => firestore && assetId ? doc(firestore, 'assets', assetId) : null, [firestore, assetId]);
  const { data: asset, isLoading: isLoadingAsset } = useDoc<Asset>(assetDocQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  // Built-in templates (Contrato de Uso)
  const usageTemplates = useMemo(() => ([
    {
      id: 'usage_default',
      name: 'Contrato de Uso Padrão',
      type: 'usage_contract',
      content: 'Eu, {{user.name}}, recebo o {{asset.name}} (SN {{asset.serialNumber}}) e comprometo-me a zelar pelo bem. Data: {{today}}.',
      checklist: ['Sem trincas na tela', 'Carregador incluso', 'Funcionamento de teclado e portas'],
    },
    {
      id: 'usage_juridico',
      name: 'Termo de Responsabilidade (Jurídico)',
      type: 'usage_contract',
      content: '### TERMO DE RESPONSABILIDADE\n\nCONCEDENTE: {{company.name}} (CNPJ {{company.cnpj}}).\nRESPONSÁVEL: {{user.name}} (CPF {{user.cpf}}, RG {{user.rg}}).\n\nDeclaro que recebo o {{asset.name}} (SN {{asset.serialNumber}}), comprometendo-me com guarda, conservação e devolução. Data: {{today}}.',
      checklist: ['Condição externa ok', 'Acessórios entregues', 'Testes funcionais realizados'],
    },
  ]), []);

  // Role check: only managers/devs can create contracts
  const userDocQuery = useMemoFirebase(() => firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile } = useDoc<User>(userDocQuery);
  const roleId = userProfile?.roleId;
  
  const roleDocQuery = useMemoFirebase(() => firestore && roleId ? doc(firestore, 'roles', roleId) : null, [firestore, roleId]);
  const { data: roleData } = useDoc<any>(roleDocQuery);
  const isManager = !!roleData?.permissions?.isManager;

  const [search, setSearch] = useState('');
  const filteredUsers = useMemo(() => {
    const all = users || [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [users, search]);

  const [form, setForm] = useState({
    userId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    clauses: 'O usuário compromete-se a zelar pelo equipamento, devolvendo-o no estado em que o recebeu, salvo desgaste natural. Em caso de dano ou perda, responsabiliza-se conforme política interna.',
    checklistEntrega: ['Sem trincas na tela', 'Carregador incluso', 'Funcionamento de teclado e portas'],
    checklistDevolucao: ['Sem trincas na tela', 'Carregador presente', 'Sem danos aparentes'],
    observations: ''
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (asset?.assigneeId) setForm(prev => ({ ...prev, userId: asset.assigneeId! }));
  }, [asset?.assigneeId]);

  const handleAddChecklistItem = (list: 'checklistEntrega' | 'checklistDevolucao') => {
    setForm(prev => ({ ...prev, [list]: [...(prev as any)[list], ''] as any }));
  };

  // Apply selected template to form fields
  const applyTemplate = () => {
    if (!selectedTemplateId) return;
    const t = usageTemplates.find((x: any) => x.id === selectedTemplateId);
    if (!t) return;
    setForm(prev => ({
      ...prev,
      clauses: t.content || prev.clauses,
      checklistEntrega: Array.isArray((t as any).checklist) && (t as any).checklist.length ? (t as any).checklist : prev.checklistEntrega,
      checklistDevolucao: Array.isArray((t as any).checklist) && (t as any).checklist.length ? (t as any).checklist : prev.checklistDevolucao,
    }));
  };

  const handleUpdateChecklistItem = (list: 'checklistEntrega' | 'checklistDevolucao', idx: number, val: string) => {
    setForm(prev => {
      const next = { ...(prev as any) } as any;
      next[list] = [...next[list]];
      next[list][idx] = val;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!firestore || !asset) return;
    if (!form.userId) return alert('Selecione um usuário');
    const selectedUser = (users || []).find(u => u.id === form.userId) as any;
    const payload = {
      assetId: asset.id,
      assetName: asset.name,
      userId: form.userId,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      clauses: form.clauses,
      checklistEntrega: (form.checklistEntrega || []).filter(Boolean),
      checklistDevolucao: (form.checklistDevolucao || []).filter(Boolean),
      observations: form.observations || '',
      createdAt: new Date().toISOString(),
      status: 'Ativo' as const,
    };
    const ref = await addDocumentNonBlocking(collection(firestore, 'assetUsageContracts'), payload as any);

    // Vincula o ativo ao usuário e atualiza status
    updateDocumentNonBlocking(doc(firestore, 'assets', asset.id), {
      assigneeId: form.userId,
      status: 'Em uso',
      currentContractId: ref.id,
      updatedAt: new Date().toISOString(),
    });

    // Gera automaticamente o Anexo I (Termo de Entrega)
    const deliveryContent = `Entrego o ${asset.name} (SN ${asset.serialNumber || 'N/D'}) ao usuário ${selectedUser?.name || form.userId}. Data: ${new Date().toLocaleDateString('pt-BR')}.`;
    await addDocumentNonBlocking(collection(firestore, `assetUsageContracts/${ref.id}/annexes`), {
      type: 'delivery_term',
      content: deliveryContent,
      checklist: (form.checklistEntrega || []).filter(Boolean),
      createdAt: new Date().toISOString(),
    } as any);

    // Adiciona histórico do vínculo
    await addDocumentNonBlocking(collection(firestore, `assets/${asset.id}/history`), {
      type: 'contract_created',
      message: `Contrato de uso criado e ativo vinculado ao usuário ${form.userId}.`,
      contractId: ref.id,
      userId: form.userId,
      createdAt: new Date().toISOString(),
    } as any);
    router.push(`/reports/usage-contract/${ref.id}`);
  };

  if (isLoadingAsset || isLoadingUsers) {
    return <Skeleton className="h-[400px]" />
  }

  if (!asset) return <p className="text-muted-foreground">Ativo não encontrado.</p>;

  if (!isManager) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso negado</CardTitle>
            <CardDescription>Apenas gestores podem criar contratos de uso.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Novo Contrato de Uso</h1>
        <p className="text-muted-foreground">Crie um contrato personalizado para o ativo selecionado.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{asset.name}</CardTitle>
          <CardDescription>Preencha os dados do contrato e os checklists de entrega/devolução.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Modelo (opcional)</Label>
              <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm w-full mt-1">
                <option value="">Selecione um modelo de Contrato de Uso</option>
                {usageTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={applyTemplate} disabled={!selectedTemplateId}>Aplicar Modelo</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <Input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1" />
              <div className="max-h-48 overflow-auto border rounded-md mt-2">
                <table className="w-full text-sm">
                  <tbody>
                    {filteredUsers?.slice(0, 50).map(u => (
                      <tr key={u.id} className={form.userId === u.id ? 'bg-muted/50' : ''}>
                        <td>
                          <button className="w-full text-left p-2" onClick={() => setForm(prev => ({ ...prev, userId: u.id }))}>
                            {u.name} <span className="text-muted-foreground">({u.email})</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Fim (opcional)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observations} onChange={e => setForm(prev => ({ ...prev, observations: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Checklist de Entrega</Label>
              <div className="space-y-2 mt-2">
                {form.checklistEntrega.map((item, idx) => (
                  <Input key={idx} value={item} onChange={e => handleUpdateChecklistItem('checklistEntrega', idx, e.target.value)} />
                ))}
                <Button variant="outline" onClick={() => handleAddChecklistItem('checklistEntrega')}>Adicionar item</Button>
              </div>
            </div>
            <div>
              <Label>Checklist de Devolução</Label>
              <div className="space-y-2 mt-2">
                {form.checklistDevolucao.map((item, idx) => (
                  <Input key={idx} value={item} onChange={e => handleUpdateChecklistItem('checklistDevolucao', idx, e.target.value)} />
                ))}
                <Button variant="outline" onClick={() => handleAddChecklistItem('checklistDevolucao')}>Adicionar item</Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Cláusulas</Label>
            <Textarea rows={6} value={form.clauses} onChange={e => setForm(prev => ({ ...prev, clauses: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.userId}>Gerar Contrato</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
