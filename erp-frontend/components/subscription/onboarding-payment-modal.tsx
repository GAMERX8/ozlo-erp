"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { OnboardingForm } from "./onboarding-form";

interface OnboardingPaymentModalProps {
    workspaceId: string;
    workspaceSlug: string;
    userEmail: string;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function OnboardingPaymentModal({
    workspaceId,
    workspaceSlug,
    userEmail,
    open,
    onOpenChange,
}: OnboardingPaymentModalProps) {
    const isCloseable = !!onOpenChange;

    return (
        <Dialog open={open} onOpenChange={isCloseable ? onOpenChange : () => { }}>
            <DialogContent
                className="max-w-[1400px] w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-background border-border text-foreground shadow-2xl rounded-2xl flex flex-col"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                showCloseButton={isCloseable}
            >
                <DialogTitle className="sr-only">Configuración de Instancia</DialogTitle>
                <DialogDescription className="sr-only">Complete los pasos para configurar su bot e integración.</DialogDescription>
                <OnboardingForm
                    workspaceId={workspaceId}
                    workspaceSlug={workspaceSlug}
                    userEmail={userEmail}
                    isModal={true}
                />
            </DialogContent>
        </Dialog>
    );
}
