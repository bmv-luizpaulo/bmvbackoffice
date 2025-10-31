'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Asset, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

function ReportItem({ label, value }: { label: string; value?: React.ReactNode }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    )
}

export default function AssetDeliveryTermPage() {
  const params = useParams();
  const firestore = useFirestore();
  const assetId = params.assetId as string;

  const assetRef = useMemoFirebase(() => (firestore && assetId ? doc(firestore, 'assets', assetId) : null), [firestore, assetId]);
  const { data: asset, isLoading: isLoadingAsset } = useDoc<Asset>(assetRef);
  
  const assigneeId = asset?.assigneeId;
  const userRef = useMemoFirebase(() => (firestore && assigneeId ? doc(firestore, 'users', assigneeId) : null), [firestore, assigneeId]);
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userRef);

  const isLoading = isLoadingAsset || isLoadingUser;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
      </div>
    );
  }

  if (!asset || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white p-8">
        <div className="text-center">
            <h1 className="text-xl font-bold">Erro ao Gerar Termo</h1>
            <p className="text-gray-600">Não foi possível encontrar o ativo ou o usuário responsável. Verifique se o ativo está atribuído a alguém.</p>
            <Button onClick={() => window.history.back()} className='mt-4'>Voltar</Button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
        <div className="fixed top-4 right-4 print:hidden">
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / Salvar PDF
            </Button>
        </div>
      <div className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none">
        <header className="flex items-center justify-between border-b pb-6">
            <div className="flex items-center gap-4">
                <Image src="/image/BMV.png" alt="BMV Logo" width={150} height={50} />
            </div>
            <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800">Termo de Responsabilidade</h2>
                <p className="text-sm text-gray-500">Entrega de Ativo</p>
            </div>
        </header>

        <main className="mt-8">
            <h1 className="text-center text-xl font-semibold uppercase tracking-wider text-gray-700">
                Termo de Entrega de Equipamento
            </h1>

            <p className="mt-8 text-base leading-relaxed text-gray-700">
                Eu, <strong className="font-bold">{user.name}</strong>, portador(a) do CPF nº <strong className="font-bold">{user.personalDocument || '___________________'}</strong>, declaro para os devidos fins que recebi da empresa <strong className="font-bold">BMV GLOBAL</strong>, CNPJ nº 23.226.548/0001-81, o(s) equipamento(s) listado(s) abaixo, em perfeito estado de conservação e funcionamento.
            </p>

            <div className="mt-8 rounded-lg border bg-gray-50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-800">Detalhes do Ativo</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <ReportItem label="Nome do Ativo" value={asset.name} />
                    <ReportItem label="Tipo" value={asset.type} />
                    <ReportItem label="Nº de Série / Identificador" value={asset.serialNumber} />
                    <ReportItem label="Status na Entrega" value="Em Uso" />
                    <ReportItem label="Descrição" value={asset.description} />
                </div>
            </div>

            <div className="mt-8 space-y-4 text-sm text-gray-600">
                <p>Comprometo-me a utilizar o equipamento exclusivamente para fins profissionais, zelando por sua integridade, conservação e bom funcionamento.</p>
                <p>Estou ciente de que sou responsável por qualquer dano, perda, furto ou roubo do equipamento, exceto em casos de desgaste natural por uso normal ou defeito de fabricação. Devo comunicar imediatamente à empresa qualquer ocorrência que afete o equipamento.</p>
                <p>Ao término do meu vínculo empregatício ou mediante solicitação da empresa, comprometo-me a devolver o equipamento nas mesmas condições em que o recebi, ressalvado o desgaste natural.</p>
            </div>

        </main>

        <footer className="mt-24">
            <div className="flex justify-between items-center text-center">
                <div className="flex-1">
                    <div className="mx-auto h-px w-4/5 bg-gray-400"></div>
                    <p className="mt-2 text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">Assinatura do Colaborador</p>
                </div>
                <div className="flex-1">
                     <div className="mx-auto h-px w-4/5 bg-gray-400"></div>
                    <p className="mt-2 text-sm font-medium">BMV GLOBAL</p>
                    <p className="text-xs text-gray-500">Assinatura do Representante</p>
                </div>
            </div>
             <p className="mt-12 text-center text-xs text-gray-400">
                Data de Emissão: {today}
            </p>
        </footer>

      </div>
    </div>
  );
}
