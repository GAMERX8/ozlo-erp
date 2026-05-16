import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_URL } from "./lib/config";

// Extend types
declare module "next-auth" {
    interface Session {
        access_token?: string;
        mfa_required?: boolean;
        user: {
            id: string;
            first_name: string;
            last_name: string;
            role?: string;
            avatar?: string;
            provider?: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        access_token?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        avatar?: string;
        mfa_required?: boolean;
        provider?: string;
    }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                token: { label: "Token", type: "text" },
            },
            async authorize(credentials) {
                try {
                    const email = credentials?.email as string;
                    const password = credentials?.password as string;
                    const token = (credentials as any)?.token as string;

                    // Si ya tenemos un token (flujo post-MFA), usarlo directamente
                    if (token && email) {
                        // Obtener perfil del usuario con el token
                        const profileResponse = await fetch(`${API_URL}/auth/profile`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });

                        if (!profileResponse.ok) {
                            return null;
                        }

                        const userData = await profileResponse.json();
                        return {
                            id: userData.id,
                            email: userData.email,
                            first_name: userData.first_name,
                            last_name: userData.last_name,
                            role: userData.role,
                            avatar: userData.avatar,
                            access_token: token,
                            mfa_required: false,
                        };
                    }

                    // Llamar al backend NestJS para login
                    const response = await fetch(`${API_URL}/auth/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email, password }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        console.error("Login error:", error);
                        return null;
                    }

                    const data = await response.json();
                    
                    if (!data.access_token || !data.user) {
                        return null;
                    }

                    return {
                        id: data.user.id,
                        email: data.user.email,
                        first_name: data.user.first_name,
                        last_name: data.user.last_name,
                        role: data.user.role,
                        avatar: data.user.avatar,
                        access_token: data.access_token,
                        mfa_required: data.mfa_required || false,
                    };
                } catch (e) {
                    console.error("Authorize error:", e);
                    return null;
                }
            },
        }),
        // Provider para OAuth callback (Google, etc.)
        CredentialsProvider({
            id: "oauth-callback",
            name: "OAuth Callback",
            credentials: {
                oauthData: { label: "OAuth Data", type: "text" },
            },
            async authorize(credentials) {
                try {
                    const oauthDataStr = credentials?.oauthData as string;
                    if (!oauthDataStr) {
                        return null;
                    }

                    const oauthData = JSON.parse(oauthDataStr);
                    
                    return {
                        id: oauthData.id,
                        email: oauthData.email,
                        first_name: oauthData.first_name,
                        last_name: oauthData.last_name,
                        role: oauthData.role,
                        avatar: oauthData.avatar,
                        access_token: oauthData.access_token,
                        provider: oauthData.provider,
                        mfa_required: false,
                    };
                } catch (e) {
                    console.error("OAuth authorize error:", e);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // First-time login, save the information inside jwt
            if (user) {
                return {
                    ...token,
                    access_token: user.access_token,
                    mfa_required: user.mfa_required,
                    provider: user.provider,
                    user_data: user.mfa_required ? undefined : {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role,
                        avatar: user.avatar,
                        provider: user.provider,
                    },
                };
            }

            // Handle session update trigger
            if (trigger === "update" && session) {
                return {
                    ...(token as any),
                    user_data: {
                        ...(token as any).user_data,
                        ...session,
                    },
                };
            }

            return token;
        },
        async session({ session, token }: any) {
            if (token) {
                session.access_token = token.access_token;
                session.mfa_required = token.mfa_required;
                session.provider = token.provider;
                if (token.user_data) {
                    session.user = {
                        ...session.user,
                        ...token.user_data,
                    };
                }
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    trustHost: true,
});
