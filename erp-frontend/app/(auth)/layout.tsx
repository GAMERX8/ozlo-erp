import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Autenticación | ${APP_NAME}`,
    description: `Inicia sesión o crea tu cuenta en ${APP_NAME}`,
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="relative flex items-center justify-center md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-medium">
                        <Logo width={180} height={54} className="h-12 w-auto" />
                    </Link>
                    <div className="absolute right-0">
                        <ModeToggle />
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        {children}
                    </div>
                </div>
            </div>
            <div className="relative hidden lg:flex items-center justify-center bg-background p-8">
                <div 
                    className="relative w-full h-full rounded-2xl overflow-hidden"
                    style={{
                        backgroundImage: `url('/background/login-bg.png')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />
            </div>
        </div>
    );
}
