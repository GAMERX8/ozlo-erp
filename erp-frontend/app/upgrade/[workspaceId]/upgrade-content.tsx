"use client";

import { useState, useEffect } from "react";
import { PlanSelectorWrapper } from "./plan-selector-wrapper";

interface UpgradeContentProps {
    workspaceId: string;
    workspaceSlug: string;
}

export function UpgradeContent({ workspaceId, workspaceSlug }: UpgradeContentProps) {
    const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);

    // Leer código del localStorage al montar
    useEffect(() => {
        const savedCode = localStorage.getItem('promoCode');
        if (savedCode) {
            setAppliedPromoCode(savedCode);
        }
    }, []);

    return (
        <PlanSelectorWrapper 
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            promoCode={appliedPromoCode}
        />
    );
}
