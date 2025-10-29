import { KpiCard } from "@/components/dashboard/kpi-card";
import { opportunities } from "@/lib/data";
import { BarChart, DollarSign, Handshake, Target } from "lucide-react";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ChatSummary } from "@/components/dashboard/chat-summary";

export default function DashboardPage() {
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const wonValue = opportunities.filter(opp => opp.stage === 'Ganha').reduce((sum, opp) => sum + opp.value, 0);
  const openOpportunities = opportunities.filter(opp => opp.stage !== 'Ganha' && opp.stage !== 'Perdida').length;
  const conversionRate = (opportunities.filter(opp => opp.stage === 'Ganha').length / opportunities.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">Seu centro de comando para vendas e operações.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Valor Total do Pipeline" 
          value={`$${(totalValue / 1000).toFixed(1)}k`}
          description="Valor total de todas as oportunidades"
          icon={<DollarSign className="text-primary"/>}
        />
        <KpiCard 
          title="Total Fechado (Ganha)" 
          value={`$${(wonValue / 1000).toFixed(1)}k`}
          description="Valor dos negócios ganhos"
          icon={<Handshake className="text-green-500"/>}
        />
        <KpiCard 
          title="Oportunidades Abertas" 
          value={openOpportunities.toString()}
          description="Negócios atualmente em andamento"
          icon={<BarChart className="text-blue-500"/>}
        />
        <KpiCard 
          title="Taxa de Conversão" 
          value={`${conversionRate.toFixed(1)}%`}
          description="De lead para ganha"
          icon={<Target className="text-amber-500"/>}
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
