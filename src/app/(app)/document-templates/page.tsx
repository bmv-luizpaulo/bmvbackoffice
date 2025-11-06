'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Save, Copy, Wand2, X } from 'lucide-react';

const TYPES = [
  { value: 'usage_contract', label: 'Contrato de Uso' },
  { value: 'delivery_term', label: 'Termo de Entrega' },
  { value: 'return_term', label: 'Termo de Devolução' },
  { value: 'promissory_note', label: 'Nota Promissória' },
] as const;

type TemplateType = typeof TYPES[number]['value'];

type Template = {
  id: string;
  name: string;
  type: TemplateType;
  content: string; // pode conter placeholders {{asset.name}}, {{user.name}}, etc
  checklist?: string[]; // opcional para termos
  createdAt?: any;
  updatedAt?: any;
};

export default function DocumentTemplatesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const templatesQuery = useMemoFirebase(
    () => (firestore && user) ? query(collection(firestore, 'documentTemplates'), orderBy('name')) : null,
    [firestore, user]
  );
  const { data: templates, isLoading } = useCollection<Template>(templatesQuery);

  const [typeFilter, setTypeFilter] = React.useState<TemplateType | 'all'>('all');
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const list = templates || [];
    const q = search.toLowerCase().trim();
    return list.filter(t => (typeFilter === 'all' || t.type === typeFilter) && (!q || t.name.toLowerCase().includes(q)));
  }, [templates, search, typeFilter]);

  const [editing, setEditing] = React.useState<Template | null>(null);
  const [form, setForm] = React.useState<Partial<Template>>({ name: '', type: 'usage_contract', content: '', checklist: [] });
  const contentRef = React.useRef<HTMLTextAreaElement | null>(null);

  const PLACEHOLDERS = React.useMemo(() => ([
    { key: '{{asset.name}}', label: 'Ativo: Nome' },
    { key: '{{asset.serialNumber}}', label: 'Ativo: Nº Série' },
    { key: '{{asset.type}}', label: 'Ativo: Tipo' },
    { key: '{{asset.status}}', label: 'Ativo: Status' },
    { key: '{{asset.location}}', label: 'Ativo: Localização' },
    { key: '{{user.name}}', label: 'Usuário: Nome' },
    { key: '{{user.email}}', label: 'Usuário: Email' },
    { key: '{{user.phone}}', label: 'Usuário: Telefone' },
    { key: '{{user.cpf}}', label: 'Usuário: CPF' },
    { key: '{{user.rg}}', label: 'Usuário: RG' },
    { key: '{{user.role}}', label: 'Usuário: Cargo' },
    { key: '{{user.address}}', label: 'Usuário: Endereço' },
    { key: '{{company.name}}', label: 'Empresa: Razão Social' },
    { key: '{{company.cnpj}}', label: 'Empresa: CNPJ' },
    { key: '{{company.city}}', label: 'Empresa: Cidade' },
    { key: '{{company.city_state}}', label: 'Empresa: Cidade/Estado' },
    { key: '{{company.legalRepName}}', label: 'Empresa: Representante Legal' },
    { key: '{{company.legalRepRole}}', label: 'Empresa: Cargo do Representante' },
    { key: '{{note.amount}}', label: 'Nota Promissória: Valor' },
    { key: '{{note.amountExtenso}}', label: 'Nota Promissória: Valor por Extenso' },
    { key: '{{today}}', label: 'Data de Hoje' },
  ]), []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', type: 'usage_contract', content: '', checklist: [] });
  };

  const loadLegalModel1 = () => {
    const legalText = `
---

### **Modelo 1: TERMO DE RESPONSABILIDADE POR ATIVOS PATRIMONIAIS**

**PARTES:**

**CONCEDENTE:** [RAZÃO SOCIAL DA EMPRESA], inscrita no CNPJ sob nº [NÚMERO DO CNPJ], representada por [NOME DO REPRESENTANTE LEGAL], [CARGO], doravante denominada **CONCEDENTE**.

**COLABORADOR/RESPONSÁVEL:** [NOME COMPLETO DO FUNCIONÁRIO], portador do RG nº [NÚMERO DO RG] e CPF nº [NÚMERO DO CPF], ocupante do cargo de [CARGO DO FUNCIONÁRIO] na empresa, doravante denominado **RESPONSÁVEL**.

**CLÁUSULA 1ª – DO OBJETO**
1.1. O presente instrumento tem por objeto estabelecer as condições de uso, guarda e conservação dos bens patrimoniais listados no **ANEXO I - TERMO DE ENTREGA**, que integra e é parte inseparável deste termo, os quais são de propriedade da CONCEDENTE e ficarão sob a responsabilidade do RESPONSÁVEL para uso exclusivo no desempenho de suas funções.

**CLÁUSULA 2ª – DAS CONDIÇÕES DE USO E CONSERVAÇÃO**
2.1. O RESPONSÁVEL obriga-se a:
    a) Utilizar os bens apenas para fins profissionais, no âmbito de suas atribuições laborais.
    b) Zelar pela conservação, guarda e segurança dos bens, utilizando-os com o cuidado e diligência de um bom pai de família.
    c) Comunicar imediatamente à CONCEDENTE qualquer avaria, defeito, perda, furto ou roubo do bem.
    d) Abster-se de efetuar quaisquer reparos, modificações ou melhorias nos bens sem autorização prévia e por escrito da CONCEDENTE.
    e) Não ceder, emprestar, alugar, vender, penhorar ou de qualquer forma alienar os bens a terceiros.

**CLÁUSULA 3ª – DA RESPONSABILIDADE E INDENIZAÇÃO**
3.1. O RESPONSÁVEL assume integral responsabilidade pelos bens listados, desde a assinatura do **ANEXO I - TERMO DE ENTREGA** até a devolução formal e assinatura do **ANEXO II - TERMO DE DEVOLUÇÃO**.
3.2. Em caso de perda, furto, roubo, dano irreparável ou destruição do bem, o RESPONSÁVEL obriga-se a indenizar a CONCEDENTE pelo valor de mercado do bem na data do sinistro, a ser apurado mediante laudo técnico.
3.3. Em caso de danos reparáveis, o RESPONSÁVEL arcará com todas as despesas de conserto para restabelecer o bem ao seu estado original.
3.4. A CONCEDENTE se reserva o direito de descontar em folha de pagamento o valor da indenização ou das despesas de conserto, nos termos permitidos pela legislação trabalhista, desde que comunicado previamente o funcionário.

**CLÁUSULA 4ª – DA NOTA PROMISSÓRIA (TÍTULO EXECUTIVO EXTRAJUDICIAL)**
4.1. Como garantia do fiel cumprimento das obrigações assumidas neste termo, especialmente da obrigação de restituir o bem em perfeitas condições, o RESPONSÁVEL firma, em anexo, **NOTA PROMISSÓRIA** no valor de R$ [VALOR CORRESPONDENTE AO BEM OU A MULTA CONTRATUAL], emitida em favor da CONCEDENTE.
4.2. Fica acordado que o descumprimento das obrigações de restituir o bem ou de indenizar a CONCEDENTE, conforme Cláusula 3ª, caracterizará o vencimento antecipado da nota promissória, que se tornará imediatamente exigível, podendo a CONCEDENTE promover sua execução judicial sem necessidade de qualquer interpelação ou aviso prévio.

**CLÁUSULA 5ª – DA DEVOLUÇÃO**
5.1. A devolução do bem ocorrerá mediante solicitação da CONCEDENTE ou por ocasião do desligamento do RESPONSÁVEL da empresa, independentemente do motivo.
5.2. A restituição será formalizada pela assinatura do **ANEXO II - TERMO DE DEVOLUÇÃO**, onde serão registradas eventuais avarias ou o estado de conservação no momento da devolução.

**CLÁUSULA 6ª – DO FORO**
Para dirimir quaisquer dúvidas oriundas deste termo, as partes elegem o foro da comarca de [CIDADE DA EMPRESA], com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justas e acordadas, as partes assinam o presente termo em duas vias de igual teor e forma.

[CIDADE], [DATA].

**_________________________________________**
**[NOME DO REPRESENTANTE LEGAL]**
**CONCEDENTE**
[RAZÃO SOCIAL DA EMPRESA]

**_________________________________________**
**[NOME COMPLETO DO FUNCIONÁRIO]**
**RESPONSÁVEL**
RG: [Nº RG]
CPF: [Nº CPF]

---

### **ANEXO I - TERMO DE ENTREGA**

Eu, [NOME COMPLETO DO FUNCIONÁRIO], CPF [Nº CPF], recebi da [NOME DA EMPRESA] os seguintes bens patrimoniais, para uso no exercício de minhas funções, conforme descrito abaixo:

| ID do Patrimônio | Descrição Detalhada do Bem (Marca, Modelo, Nº Série, etc.) | Estado de Conservação | Acessórios Entregues |
| :--- | :--- | :--- | :--- |
| [Ex: PAT-123] | [Ex: Notebook Dell Latitude 5420, S/N: ABC123, i5, 8GB RAM] | [Ex: Bom estado, sem avarias visíveis na carcaça e tela] | [Ex: Fonte de alimentação, cabo de força] |
| [Ex: PAT-456] | [Ex: Veículo Hyundai HB20 1.0, Placa: ABC1D23, Ano 2022] | [Ex: Bom estado, com pequeno arranhão na porta do motorista] | [Ex: Chaves, estepe, manual] |
| | | | |

Declaro estar ciente de que sou integralmente responsável pela guarda, conservação e integridade dos bens listados acima, de acordo com o Termo de Responsabilidade ao qual este documento está anexo.

Data da Entrega: ____/____/______

Assinatura do Responsável: _________________________

Nome e Assinatura do Representante da Empresa: _________________________

---

### **ANEXO II - TERMO DE DEVOLUÇÃO**

Eu, [NOME COMPLETO DO FUNCIONÁRIO], CPF [Nº CPF], devolvo à [NOME DA EMPRESA] os bens patrimoniais que me foram confiados, conforme listado abaixo:

| ID do Patrimônio | Descrição do Bem | Estado de Conservação na Devolução | Acessórios Devolvidos | Observações |
| :--- | :--- | :--- | :--- | :--- |
| [PAT-123] | [Notebook Dell Latitude 5420] | [Ex: Tela riscada] | [Fonte, cabo] | [Necessário reparo na tela] |
| [PAT-456] | [Veículo Hyundai HB20] | [Ex: Amassado na porta] | [Chaves, estepe] | [ ] |
| | | | | |

A CONCEDENTE confirma o recebimento dos itens listados acima no estado descrito.

Data da Devolução: ____/____/______

Assinatura do Responsável: _________________________

Nome e Assinatura do Representante da Empresa: _________________________

---

### **NOTA PROMISSÓRIA**

Valor: R$ [VALOR] ([VALOR POR EXTENSO])
Data de Emissão: [DATA]
Local de Emissão: [CIDADE, ESTADO]
Vencimento: Na data do descumprimento das obrigações do Termo de Responsabilidade, conforme cláusula 4.2.

Pagarei por esta única via de NOTA PROMISSÓRIA, à ordem de [NOME DA EMPRESA], inscrita no CNPJ [Nº CNPJ], o valor de R$ [VALOR] ([VALOR POR EXTENSO]), em [CIDADE/ESTADO]. O presente título servirá como título executivo extrajudicial nos termos da lei.

Aceito e pago,

[CIDADE], [DATA].

**_________________________________________**
**[NOME COMPLETO DO FUNCIONÁRIO]**
**CPF: [Nº CPF]**
**Endereço: [ENDEREÇO COMPLETO]**
**RG: [Nº RG]**

---
`;
    setForm(prev => ({ ...prev, name: 'Termo de Responsabilidade por Ativos (Jurídico)', type: 'usage_contract', content: legalText }));
    // Converte imediatamente os campos colcheteados em placeholders
    setTimeout(() => convertBracketedToPlaceholders(), 0);
  };
  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, type: t.type, content: t.content, checklist: t.checklist || [] });
  };

  const handleAddChecklistItem = () => setForm(prev => ({ ...prev, checklist: [...(prev.checklist || []), ''] }));
  const updateChecklistItem = (idx: number, val: string) => setForm(prev => {
    const next = { ...(prev as any) } as any;
    next.checklist = [...(prev.checklist || [])];
    next.checklist[idx] = val;
    return next;
  });
  const removeChecklistItem = (idx: number) => setForm(prev => {
    const next = { ...(prev as any) } as any;
    next.checklist = [...(prev.checklist || [])];
    next.checklist.splice(idx, 1);
    return next;
  });

  const insertPlaceholder = (text: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setForm(prev => ({ ...prev, content: (prev.content || '') + text }));
      return;
    }
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const current = form.content || '';
    const next = current.slice(0, start) + text + current.slice(end);
    setForm(prev => ({ ...prev, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + text.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const sampleAsset = { name: 'Notebook Dell', serialNumber: 'ABC123', type: 'Notebook', status: 'Em Uso', location: 'São Paulo' } as any;
  const sampleUser = { name: 'Maria Souza', email: 'maria@bmv.global', phone: '(11) 99999-0000', cpf: '123.456.789-00', rg: '12.345.678-9', role: 'Analista', address: 'Av. Central, 1000 - São Paulo/SP' } as any;
  const sampleCompany = { name: 'BMV Global Ltda.', cnpj: '12.345.678/0001-99', city: 'São Paulo', city_state: 'São Paulo/SP', legalRepName: 'João Silva', legalRepRole: 'Diretor' } as any;
  const sampleNote = { amount: '5.000,00', amountExtenso: 'cinco mil reais' } as any;
  const mergedPreview = React.useMemo(() => {
    const src = form.content || '';
    return src
      .replace(/\{\{asset.name\}\}/g, sampleAsset.name)
      .replace(/\{\{asset.serialNumber\}\}/g, sampleAsset.serialNumber)
      .replace(/\{\{asset.type\}\}/g, sampleAsset.type)
      .replace(/\{\{asset.status\}\}/g, sampleAsset.status)
      .replace(/\{\{asset.location\}\}/g, sampleAsset.location)
      .replace(/\{\{user.name\}\}/g, sampleUser.name)
      .replace(/\{\{user.email\}\}/g, sampleUser.email)
      .replace(/\{\{user.phone\}\}/g, sampleUser.phone)
      .replace(/\{\{user.cpf\}\}/g, sampleUser.cpf)
      .replace(/\{\{user.rg\}\}/g, sampleUser.rg)
      .replace(/\{\{user.role\}\}/g, sampleUser.role)
      .replace(/\{\{user.address\}\}/g, sampleUser.address)
      .replace(/\{\{company.name\}\}/g, sampleCompany.name)
      .replace(/\{\{company.cnpj\}\}/g, sampleCompany.cnpj)
      .replace(/\{\{company.city\}\}/g, sampleCompany.city)
      .replace(/\{\{company.city_state\}\}/g, sampleCompany.city_state)
      .replace(/\{\{company.legalRepName\}\}/g, sampleCompany.legalRepName)
      .replace(/\{\{company.legalRepRole\}\}/g, sampleCompany.legalRepRole)
      .replace(/\{\{note.amount\}\}/g, sampleNote.amount)
      .replace(/\{\{note.amountExtenso\}\}/g, sampleNote.amountExtenso)
      .replace(/\{\{today\}\}/g, new Date().toLocaleDateString('pt-BR'));
  }, [form.content]);

  const convertBracketedToPlaceholders = () => {
    const map: Array<[RegExp, string]> = [
      [/\[RAZÃO SOCIAL DA EMPRESA\]/gi, '{{company.name}}'],
      [/\[NOME DA EMPRESA\]/gi, '{{company.name}}'],
      [/\[NÚMERO DO CNPJ\]|\[Nº CNPJ\]/gi, '{{company.cnpj}}'],
      [/\[NOME DO REPRESENTANTE LEGAL\]/gi, '{{company.legalRepName}}'],
      [/\[CARGO\]([^A-Z]|$)/g, '{{company.legalRepRole}}$1'],
      [/\[CARGO DO FUNCIONÁRIO\]/gi, '{{user.role}}'],
      [/\[NOME COMPLETO DO FUNCIONÁRIO\]/gi, '{{user.name}}'],
      [/\[NÚMERO DO RG\]|\[Nº RG\]/gi, '{{user.rg}}'],
      [/\[NÚMERO DO CPF\]|\[Nº CPF\]/gi, '{{user.cpf}}'],
      [/\[ENDEREÇO COMPLETO\]/gi, '{{user.address}}'],
      [/\[CIDADE DA EMPRESA\]/gi, '{{company.city}}'],
      [/\[CIDADE, ESTADO\]/gi, '{{company.city_state}}'],
      [/\[CIDADE\]/gi, '{{company.city}}'],
      [/\[DATA\]/gi, '{{today}}'],
      [/\[VALOR\]/gi, '{{note.amount}}'],
      [/\[VALOR POR EXTENSO\]/gi, '{{note.amountExtenso}}'],
    ];
    let text = form.content || '';
    for (const [pattern, repl] of map) {
      text = text.replace(pattern, repl);
    }
    setForm(prev => ({ ...prev, content: text }));
  };

  const save = async () => {
    if (!firestore) return;
    const payload = {
      name: form.name?.trim() || 'Sem título',
      type: form.type || 'usage_contract',
      content: form.content || '',
      checklist: (form.checklist || []).filter(Boolean),
      updatedAt: new Date().toISOString(),
      ...(editing ? {} : { createdAt: new Date().toISOString() }),
    };
    if (editing) {
      await updateDocumentNonBlocking(doc(firestore, 'documentTemplates', editing.id), payload);
    } else {
      await addDocumentNonBlocking(collection(firestore, 'documentTemplates'), payload);
    }
    setEditing(null);
    setForm({ name: '', type: 'usage_contract', content: '', checklist: [] });
  };

  const duplicate = async () => {
    if (!firestore || !editing) return;
    const payload = {
      name: `${editing.name} (Cópia)`,
      type: editing.type,
      content: editing.content,
      checklist: editing.checklist || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addDocumentNonBlocking(collection(firestore, 'documentTemplates'), payload as any);
  };

  const seedDefaults = async () => {
    if (!firestore) return;
    const defaults: Array<Partial<Template>> = [
      { name: 'Contrato Padrão', type: 'usage_contract', content: 'Eu, {{user.name}}, recebo o {{asset.name}} (SN {{asset.serialNumber}}). Data: {{today}}.' },
      { name: 'Termo de Entrega Padrão', type: 'delivery_term', content: 'Entrego o {{asset.name}} ao usuário {{user.name}}. Data: {{today}}.' },
      { name: 'Termo de Devolução Padrão', type: 'return_term', content: 'Devolução do {{asset.name}} por {{user.name}}. Data: {{today}}.' },
      { name: 'Nota Promissória Padrão', type: 'promissory_note', content: '{{user.name}} compromete-se a pagar o valor acordado referente ao {{asset.name}}. Data: {{today}}.' },
    ];
    for (const t of defaults) {
      await addDocumentNonBlocking(collection(firestore, 'documentTemplates'), {
        ...t,
        checklist: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    }
  };

  const remove = async (t: Template) => {
    if (!firestore) return;
    const ok = window.confirm(`Excluir modelo "${t.name}"?`);
    if (!ok) return;
    await deleteDocumentNonBlocking(doc(firestore, 'documentTemplates', t.id));
  };

  if (isUserLoading) {
    return <div className="p-6"><Skeleton className="h-8 w-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Modelos de Documentos</h1>
        <p className="text-muted-foreground">Gerencie modelos para contratos, termos e notas promissórias. Use placeholders como {"{{asset.name}}"}, {"{{user.name}}"}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Modelos</CardTitle>
          <CardDescription>Crie e edite conteúdos reutilizáveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">Todos</option>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={seedDefaults}><Wand2 className="h-4 w-4 mr-2"/>Modelos Padrão</Button>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2"/>Novo Modelo</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-md border overflow-hidden">
              {isLoading ? (
                <div className="p-6"><Skeleton className="h-6 w-full"/></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length ? filtered.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>{TYPES.find(x => x.value === t.type)?.label || t.type}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="h-4 w-4 mr-2"/>Editar</Button>
                          <Button size="sm" variant="outline" onClick={() => remove(t)}><Trash2 className="h-4 w-4 mr-2"/>Excluir</Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Nenhum modelo encontrado.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{editing ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                <div className="flex items-center gap-2">
                  {editing && (
                    <Button size="sm" variant="outline" onClick={duplicate}><Copy className="h-4 w-4 mr-2"/>Duplicar</Button>
                  )}
                  <Button size="sm" onClick={save} disabled={!form.name || !form.content}><Save className="h-4 w-4 mr-2"/>Salvar</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Nome</label>
                  <Input value={form.name || ''} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm">Tipo</label>
                  <select value={form.type as string} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as TemplateType }))} className="h-9 rounded-md border bg-background px-2 text-sm w-full">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm">Conteúdo (placeholders suportados)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PLACEHOLDERS.map(p => (
                    <Button key={p.key} type="button" variant="outline" size="sm" onClick={() => insertPlaceholder(p.key)}>{p.label}</Button>
                  ))}
                  <Button type="button" size="sm" variant="secondary" onClick={convertBracketedToPlaceholders}>Converter [campos]</Button>
                  <Button type="button" size="sm" onClick={loadLegalModel1}>Carregar modelo jurídico</Button>
                </div>
                <Textarea ref={contentRef} rows={10} value={form.content || ''} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Checklist (opcional)</label>
                  <Button size="sm" variant="outline" onClick={handleAddChecklistItem}>Adicionar item</Button>
                </div>
                <div className="space-y-2 mt-2">
                  {(form.checklist || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={item} onChange={(e) => updateChecklistItem(idx, e.target.value)} />
                      <Button type="button" size="icon" variant="outline" onClick={() => removeChecklistItem(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm">Preview</label>
                <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap min-h-[120px]">
                  {mergedPreview || <span className="text-muted-foreground">O conteúdo aparecerá aqui…</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
