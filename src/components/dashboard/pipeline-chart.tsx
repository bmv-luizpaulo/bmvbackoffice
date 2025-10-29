'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';

const chartData = [
  { name: 'A Fazer', total: 0 },
  { name: 'Em Progresso', total: 0 },
  { name: 'Concluído', total: 0 },
];

const chartConfig = {
    total: {
        label: 'Total',
        color: 'hsl(var(--primary))',
    },
} satisfies ChartConfig;

export function PipelineChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Progresso das Tarefas por Etapa</CardTitle>
                <CardDescription>Uma visão geral da distribuição de tarefas em seu funil de projetos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent
                                    formatter={(value) => `${value} tarefas`}
                                />}
                            />
                            <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    )
}
