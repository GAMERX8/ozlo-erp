"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Static imports for maximum reliability in Next.js
import claude from "@/public/icons/claude.svg";
import chatgpt from "@/public/icons/chatgpt.png";
import gemini from "@/public/icons/gemini.png";
import telegram from "@/public/icons/telegram.png";
import discord from "@/public/icons/discord.png";
import whatsapp from "@/public/icons/whatsapp.png";

const ICON_MAP = {
    claude,
    chatgpt,
    gemini,
    telegram,
    discord,
    whatsapp,
};

interface BrandIconProps {
    name: keyof typeof ICON_MAP;
    className?: string;
    size?: number;
}

export function BrandIcon({ name, className, size = 24 }: BrandIconProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={cn("animate-pulse bg-muted/10 rounded-full", className)} style={{ width: size, height: size }} />;
    }

    const src = ICON_MAP[name];

    if (!src) return null;

    return (
        <div
            className={cn("relative flex items-center justify-center overflow-hidden", className)}
            style={{ width: size, height: size }}
        >
            <Image
                src={src}
                alt={name}
                width={size}
                height={size}
                priority
                className="object-contain w-full h-full"
            />
        </div>
    );
}
