"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const router = useRouter();
    
    const handleLogout = () => {
        // Redirigir a la página de logout que maneja la limpieza completa
        router.push("/logout");
    };

    return (
        <button
            onClick={handleLogout}
            className="p-3 bg-destructive/10 text-destructive rounded-2xl hover:bg-destructive/20 transition-all border border-destructive/20"
        >
            <LogOut className="size-5" />
        </button>
    );
}

export default LogoutButton;
