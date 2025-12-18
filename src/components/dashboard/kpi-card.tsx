import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import Link from "next/link";

type KpiCardProps = {
    title: string;
    value: string;
    description: string;
    icon: ReactNode;
    href?: string;
    titleClassName?: string;
    valueClassName?: string;
    iconColor?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    className?: string;
}

export function KpiCard({ title, value, description, icon, href, titleClassName, valueClassName, iconColor, trend, trendValue, className }: KpiCardProps) {
    const content = (
        <Card className={cn(
            "group transition-all duration-300",
            href ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer" : "shadow-sm",
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-base font-medium", titleClassName)}>
                    {title}
                </CardTitle>
                <div className={cn("h-7 w-7 text-muted-foreground", iconColor)}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className={cn("text-4xl font-extrabold", valueClassName)}>
                    {value}
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
                {trend && trendValue && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                        <span className={cn(
                            "font-semibold",
                            trend === 'up' && 'text-green-600',
                            trend === 'down' && 'text-red-600',
                        )}>
                            {trendValue}
                        </span>
                        <span className="text-muted-foreground">
                            {trend === 'up' ? '▲' : '▼'}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href}>
                {content}
            </Link>
        );
    }

    return content;
}
