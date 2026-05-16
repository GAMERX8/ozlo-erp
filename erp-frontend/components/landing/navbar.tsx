import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/dashboard/nav-user";

interface LandingNavbarProps {
    user?: {
        name?: string | null;
        first_name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string | null;
    } | null;
}

export function LandingNavbar({ user }: LandingNavbarProps) {
    const isLoggedIn = !!user;

    return (
        <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md py-1">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <Logo width={120} height={36} className="h-7 w-auto" />
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <ModeToggle />
                    {isLoggedIn ? (
                        <>
                            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                                <Link href="/workspaces">Dashboard</Link>
                            </Button>
                            <NavUser user={user} variant="icon" />
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                                <Link href="/login">Ingresar</Link>
                            </Button>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                                <Link href="/signup">Empezar ahora</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
