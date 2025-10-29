'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { opportunities, STAGES } from '@/lib/data';
import { ChartTooltipContent } from '@/components/ui/chart';

const chartData = STAGES.filter(stage => stage !== 'Won' && stage !== 'Lost').map(stage => ({
    name: stage,
    total: opportunities
        .filter(opp => opp.stage === stage)
        .reduce((sum, opp) => sum + opp.value, 0)
}));

export function PipelineChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Pipeline Value by Stage</CardTitle>
                <CardDescription>An overview of the value distribution in your sales funnel.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
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
                                tickFormatter={(value) => `$${Number(value) / 1000}k`}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent
                                    formatter={(value) => `$${(value as number).toLocaleString()}`}
                                />}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
