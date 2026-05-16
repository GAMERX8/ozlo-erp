"use client";

import React, { useState, useCallback } from "react";

interface ConfirmOptions {
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
    open: boolean;
    loading: boolean;
    onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog() {
    const [state, setState] = useState<ConfirmState>({
        open: false,
        loading: false,
        title: "Confirmar acción",
        description: "",
        confirmLabel: "Confirmar",
        cancelLabel: "Cancelar",
        variant: "default",
        onConfirm: () => {},
    });

    const confirm = useCallback(
        (options: ConfirmOptions): Promise<boolean> => {
            return new Promise((resolve) => {
                setState({
                    ...options,
                    open: true,
                    loading: false,
                    onConfirm: async () => {
                        setState((prev) => ({ ...prev, loading: true }));
                        try {
                            resolve(true);
                        } catch {
                            resolve(false);
                        } finally {
                            setState((prev) => ({ ...prev, loading: false, open: false }));
                        }
                    },
                });
            });
        },
        []
    );

    const confirmAsync = useCallback(
        (options: ConfirmOptions, onConfirm: () => Promise<void>) => {
            setState({
                ...options,
                open: true,
                loading: false,
                onConfirm: async () => {
                    setState((prev) => ({ ...prev, loading: true }));
                    try {
                        await onConfirm();
                    } finally {
                        setState((prev) => ({ ...prev, loading: false, open: false }));
                    }
                },
            });
        },
        []
    );

    const close = useCallback(() => {
        setState((prev) => ({ ...prev, open: false, loading: false }));
    }, []);

    return {
        confirm,
        confirmAsync,
        close,
        state,
        setState,
    };
}
