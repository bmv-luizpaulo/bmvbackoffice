import { KpiCard } from "@/components/dashboard/kpi-card";
import { opportunities } from "@/lib/data";
import { BarChart, DollarSign, Handshake, Target } from "lucide-react";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ChatSummary } from "@/components/dashboard/chat-summary";

export default function DashboardPage() {
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const wonValue = opportunities.filter(opp => opp.stage === 'Won').reduce((sum, opp) => sum + opp.value, 0);
  const openOpportunities = opportunities.filter(opp => opp.stage !== 'Won' && opp.stage !== 'Lost').length;
  const conversionRate = (opportunities.filter(opp => opp.stage === 'Won').length / opportunities.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your command center for sales and operations.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Total Pipeline Value" 
          value={`$${(totalValue / 1000).toFixed(1)}k`}
          description="Total value of all opportunities"
          icon={<DollarSign className="text-primary"/>}
        />
        <KpiCard 
          title="Total Closed Won" 
          value={`$${(wonValue / 1000).toFixed(1)}k`}
          description="Value of deals won"
          icon={<Handshake className="text-green-500"/>}
        />
        <KpiCard 
          title="Open Opportunities" 
          value={openOpportunities.toString()}
          description="Deals currently in progress"
          icon={<BarChart className="text-blue-500"/>}
        />
        <KpiCard 
          title="Conversion Rate" 
          value={`${conversionRate.toFixed(1)}%`}
          description="From lead to won"
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
