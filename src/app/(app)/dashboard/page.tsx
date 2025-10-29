import { KpiCard } from "@/components/dashboard/kpi-card";
import { DollarSign, Handshake, Target, FolderKanban } from "lucide-react";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ChatSummary } from "@/components/dashboard/chat-summary";

export default function DashboardPage() {
  
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">Seu centro de comando para vendas e operações.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Projetos Ativos" 
          value={"0"}
          description="Total de projetos em andamento"
          icon={<FolderKanban className="text-primary"/>}
        />
        <KpiCard 
          title="Projetos Concluídos" 
          value={"0"}
          description="Projetos finalizados no último mês"
          icon={<Handshake className="text-green-500"/>}
        />
        <KpiCard 
          title="Tarefas Abertas" 
          value={"0"}
          description="Total de tarefas não concluídas"
          icon={<Target className="text-amber-500"/>}
        />
        <KpiCard 
          title="Valor Total em Projetos" 
          value={`$0k`}
          description="Valor estimado de todos os projetos"
          icon={<DollarSign className="text-blue-500"/>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PipelineChart />
        </div>
        <div className="lg:col-span-2">
          <ChatSummary />
        </div>
      </div>
    </div>
  );
}
