"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";

type ModelId = "claude" | "chatgpt" | "gemini";

type Model = {
    id: string;
    name: string;
    icon: ModelId;
};

const models: Model[] = [
    { id: "claude", name: "Claude Opus 4.5", icon: "claude" },
    { id: "gpt", name: "GPT-5.2", icon: "chatgpt" },
    { id: "gemini", name: "Géminis 3 Flash", icon: "gemini" },
];

export function ModelSelector() {
    const [selected, setSelected] = useState<string>("claude");

    return (
        <div className="mb-6">
            <h3 className="text-sm sm:text-base font-medium mb-3 text-foreground/80">
                ¿Qué modelo quieres como predeterminado?
            </h3>
            <div className="flex flex-wrap gap-2.5">
                {models.map((model) => {
                    const isSelected = model.id === selected;
                    return (
                        <button
                            key={model.id}
                            type="button"
                            onClick={() => setSelected(model.id)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer text-left ${isSelected
                                ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                                : "bg-background/50 border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-border"
                                }`}
                        >
                            <div className="flex items-center justify-center size-8 rounded-lg bg-white border border-border/50 shadow-sm">
                                <BrandIcon name={model.icon} size={18} />
                            </div>
                            <span className="font-medium text-sm text-foreground">{model.name}</span>
                            {isSelected && <Check className="size-4 text-primary" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
