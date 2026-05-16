import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/config";

export function LandingFooter() {
    return (
        <footer className="border-t py-6 bg-muted/20">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/">
                        <Logo width={90} height={26} className="h-5 w-auto opacity-50 grayscale" />
                    </Link>
                    <p className="text-xs text-muted-foreground text-center">
                        Built with ❤️ by <a href="https://rangel.pro/" className="font-medium hover:text-primary transition-colors">Neopatron Ltd.</a>
                    </p>
                    <div className="flex gap-4 sm:gap-5">
                        <a href="https://rangel.pro/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-xs">Soporte</a>
                        <a href="https://www.instagram.com/ronnaldrangel/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-xs">Instagram</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
