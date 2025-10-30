'use client';

import { useTheme } from 'next-themes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Laptop, Moon, Sun } from 'lucide-react';

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tema</CardTitle>
        <CardDescription>
          Escolha como você quer ver a interface do aplicativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={theme}
          onValueChange={setTheme}
          className="grid max-w-md grid-cols-1 gap-8 pt-2 md:grid-cols-3"
        >
          <Label className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
            <RadioGroupItem value="light" className="sr-only" />
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sun className="h-4 w-4" />
              Claro
            </span>
          </Label>
          <Label className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
            <RadioGroupItem value="dark" className="sr-only" />
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Moon className="h-4 w-4" />
              Escuro
            </span>
          </Label>
          <Label className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
            <RadioGroupItem value="system" className="sr-only" />
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Laptop className="h-4 w-4" />
              Sistema
            </span>
          </Label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
