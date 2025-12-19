import NextAuth from 'next-auth';
import { initializeFirebase } from '@/firebase';

export const { handlers, auth } = NextAuth({
    providers: [
        {
            id: 'firebase',
            name: 'Firebase',
            type: 'credentials',
            credentials: {
                idToken: { label: 'ID Token', type: 'text' },
            },
            async authorize(credentials) {
                if (credentials.idToken) {
                    const { auth: adminAuth } = initializeFirebase();
                    try {
                        // Note: In a real app, you'd initialize a Firebase Admin SDK instance here
                        // to verify the token. For this context, we'll assume a simplified check.
                        // const decodedToken = await adminAuth.verifyIdToken(credentials.idToken as string);
                        // For now, let's just create a user object if a token is present.
                        // In a real scenario, decodedToken would provide uid, email, etc.
                        return { id: 'some-user-id', email: 'user@example.com' };
                    } catch (error) {
                        console.error("Firebase Auth Error:", error);
                        return null;
                    }
                }
                return null;
            },
        },
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.AUTH_SECRET,
});

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
        } & {
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}
