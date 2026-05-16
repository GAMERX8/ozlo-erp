import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form"

import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Crear Cuenta | ${APP_NAME}`,
    description: `Crea tu cuenta en ${APP_NAME}`,
};

export default function SignupPage() {
    return <SignupForm />
}
