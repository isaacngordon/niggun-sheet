import { NextResponse } from 'next/server';

export function middleware(request: Request) {
    const { pathname } = new URL(request.url);

    if (pathname === '/old') {
        return NextResponse.redirect(new URL('/index.html', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // matcher: '/api/songs',
};