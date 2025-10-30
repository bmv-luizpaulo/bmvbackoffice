'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';

const chartConfig = {
    total: {
        label: 'Tarefas',
        color: 'hsl(var(--primary))',
    },
} satisfies ChartConfig;

type PipelineChartProps = {
    data: { name: string; total: number }[];
    isLoading: boolean;
}

export function PipelineChart({ data = [], isLoading }: PipelineChartProps) {
    const chartData = [
        { name: 'A Fazer', total: data.find(d => d.name === 'A Fazer')?.total || 0 },
        { name: 'Em Progresso', total: data.find(d => d.name === 'Em Progresso')?.total || 0 },
        { name: 'Concluído', total: data.find(d => d.name === 'Concluído')?.total || 0 },
    ];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Progresso das Tarefas por Etapa</CardTitle>
                <CardDescription>Uma visão geral da distribuição de tarefas em seu funil de projetos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {isLoading ? (
                        <Skeleton className="h-full w-full" />
                    ) : (
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
                                    allowDecimals={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    content={<ChartTooltipContent
                                        formatter={(value, name) => [`${value}`, chartConfig.total.label]}
                                    />}
                                />
                                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

    