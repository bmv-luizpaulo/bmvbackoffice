import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    // Adicione o token de autenticação, se existir
    const idToken = request.cookies.get('firebaseIdToken')?.value;
    if (idToken) {
        requestHeaders.set('Authorization', `Bearer ${idToken}`);
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: [
      /*
       * Corresponde a todos os caminhos de solicitação, exceto aqueles que começam com:
       * - api (rotas de API)
       * - _next/static (arquivos estáticos)
       * - _next/image (arquivos de otimização de imagem)
       * - favicon.ico (arquivo de favicon)
       */
      '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
