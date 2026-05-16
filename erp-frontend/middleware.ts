import { auth } from "@/auth";
import { NextResponse } from "next/server";

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/mfa/verify"];
const publicRoutes = ["/", "/api/auth", "/auth/callback"];

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role;
    
    // Log ALL requests for debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Middleware] REQUEST: ${nextUrl.pathname} | loggedIn: ${isLoggedIn} | role: ${userRole}`);
    }

    const isAuthRoute = authRoutes.includes(nextUrl.pathname);
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

    // Redirect logged in users away from auth routes
    if (isAuthRoute) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/workspaces", nextUrl));
        }
        return NextResponse.next();
    }

    // Protect admin routes
    if (nextUrl.pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", nextUrl));
        }

        if (userRole !== "super_admin") {
            return NextResponse.redirect(new URL("/workspaces", nextUrl));
        }
    }

    // Protection for all other routes except public ones
    if (!isLoggedIn && !isPublicRoute && !nextUrl.pathname.startsWith("/api")) {
        // Add cache-busting query param to prevent caching of the redirect
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("from", nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
