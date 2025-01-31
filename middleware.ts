import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth"; // Import de la fonction d'authentification

export async function middleware(req: NextRequest) {
    const session = await auth();
    const user = session?.user;

    // Si l'utilisateur est connecté et a un rôle 'admin', on permet l'accès
    if (user && user.role === 'admin') {
        return NextResponse.next();
    }

    // Si l'utilisateur est connecté mais n'a pas le rôle 'admin', on limite l'accès
    const url = req.nextUrl.pathname;
    if (user && user.role !== 'admin' && url !== "/non-admin" && url !== "/contact") {
        return NextResponse.redirect(new URL("/non-admin", req.url));
    }

    // Si l'utilisateur n'est pas connecté, on autorise seulement les routes /login et /register
    if (!user) {
        if (url === "/login" || url === "/register") {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Si l'utilisateur est connecté avec le rôle 'non-admin', on autorise /non-admin et /contact
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};