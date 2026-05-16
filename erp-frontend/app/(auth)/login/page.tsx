import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form"

import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Iniciar Sesión | ${APP_NAME}`,
    description: `Inicia sesión en tu cuenta de ${APP_NAME}`,
};

export default function LoginPage() {
    return <LoginForm />
}
