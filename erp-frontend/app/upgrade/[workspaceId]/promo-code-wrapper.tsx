"use client";

import { PromoCodeInput } from "./promo-code-input";

interface PromoCodeWrapperProps {
    workspaceId: string;
}

export function PromoCodeWrapper({ workspaceId }: PromoCodeWrapperProps) {
    return (
        <div className="max-w-md mx-auto">
            <PromoCodeInput workspaceId={workspaceId} />
        </div>
    );
}
