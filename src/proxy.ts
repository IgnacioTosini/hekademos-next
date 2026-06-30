import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthSessionTokenEdge } from "@/lib/edge-auth-session";
import { authSessionCookieName } from "@/lib/session-cookie";

const loginPath = "/auth/login";

const redirectToLogin = (request: NextRequest) => {
    const url = new URL(loginPath, request.url);
    url.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(url);
};

export async function proxy(request: NextRequest) {
    const session = await verifyAuthSessionTokenEdge(
        request.cookies.get(authSessionCookieName)?.value
    );
    const pathname = request.nextUrl.pathname;

    if (!session) {
        return redirectToLogin(request);
    }

    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/perfil", request.url));
    }

    if (pathname.startsWith("/coach") && !["ADMIN", "COACH"].includes(session.role)) {
        return NextResponse.redirect(new URL("/perfil", request.url));
    }

    if (pathname.startsWith("/student") && !["ADMIN", "STUDENT"].includes(session.role)) {
        return NextResponse.redirect(new URL("/perfil", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/perfil",
        "/coach/:path*",
        "/student/:path*",
    ],
};
