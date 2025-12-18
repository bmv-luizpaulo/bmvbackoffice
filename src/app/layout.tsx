import type { Metadata } from 'next';
import { Raleway, Montserrat } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';

// Configuração das fontes
const raleway = Raleway({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-raleway',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'SGI',
  description: 'Sistema de Gestão Integrada - BMV',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="pt-BR" 
      suppressHydrationWarning
      className={`${raleway.variable} ${montserrat.variable}`}
    >
      <body 
        className={cn(
          "font-sans antialiased min-h-screen bg-background",
          "font-montserrat" // Aplica Montserrat como fonte padrão
        )}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
