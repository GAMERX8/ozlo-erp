import { auth } from "@/auth";
import { NavUser } from "@/components/dashboard/nav-user";
import { Logo } from "@/components/logo";
import Link from "next/link";

export async function GlobalNav() {
    const session = await auth();
    if (!session?.user) return null;

    return (
        <header className="border-b border-border bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/workspaces">
                        <Logo height={40} />
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <NavUser
                        user={{
                            first_name: session.user.first_name,
                            email: session.user.email,
                            image: session.user.image,
                            role: session.user.role,
                        }}
                        variant="icon"
                    />
                </div>
            </div>
        </header>
    );
}
