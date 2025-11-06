import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ReactNode } from "react";
import Link from "next/link";

type KpiCardProps = {
    title: string;
    value: string;
    description: string;
    icon: ReactNode;
    href?: string;
}

export function KpiCard({ title, value, description, icon, href }: KpiCardProps) {
    const content = (
        <Card className={href ? "transition-colors hover:bg-muted/40 cursor-pointer" : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="h-6 w-6">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
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