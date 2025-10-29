import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-16 md:flex-row">
        <div className="w-full max-w-md text-center md:text-left">
          <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
            <Gem className="h-10 w-10 text-primary" />
            <h1 className="font-headline text-4xl font-bold tracking-tight">
              BMV Back Office
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Streamline your sales and back-office operations. Your integrated suite for pipeline management, analytics, and team collaboration.
          </p>
        </div>
        <Card className="w-full max-w-sm shrink-0">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
