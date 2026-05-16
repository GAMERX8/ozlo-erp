"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Static imports are more robust for Next.js Image component
import logoBlack from "@/public/logos/logo_black.png";
import logoWhite from "@/public/logos/logo_white.png";
import iconBlack from "@/public/logos/icon_black.png";
import iconWhite from "@/public/logos/icon_white.png";

interface LogoProps {
    type?: "full" | "icon";
    className?: string;
    width?: number;
    height?: number;
    src?: string;
    initial?: string;
    color?: string;
    priority?: boolean;
}

export function Logo({
    type = "full",
    className,
    width,
    height,
    src,
    initial,
    color,
    priority = true
}: LogoProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Placeholder dimensions while mounting
    const defaultWidth = type === "full" ? 140 : 40;
    const defaultHeight = 40;

    if (!mounted) {
        return (
            <div
                className={cn("animate-pulse bg-muted/10 rounded-md", className)}
                style={{
                    width: width || defaultWidth,
                    height: height || defaultHeight
                }}
            />
        );
    }

    const isDark = resolvedTheme === "dark";

    // Select the correct image source from static imports
    const systemLogoSrc = isDark ? logoWhite : logoBlack;
    const systemIconSrc = isDark ? iconWhite : iconBlack;

    // If we have an initial but no src, we "generate" a default logo identity
    if (!src && initial) {
        return (
            <div className="flex items-center gap-3">
                <div
                    className="flex size-8 items-center justify-center rounded-lg text-white font-bold text-lg shadow-sm"
                    style={{ backgroundColor: color || "#6366F1" }}
                >
                    {initial[0].toUpperCase()}
                </div>
                {type === "full" && (
                    <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
                        {initial}
                    </span>
                )}
            </div>
        );
    }

    const finalSrc = src || (type === "icon" ? (isDark ? "/logos/icon_white.png" : "/logos/icon_black.png") : (isDark ? "/logos/logo_white.png" : "/logos/logo_black.png"));

    // Final dimensions for the Image component
    const finalWidth = width || defaultWidth;
    const finalHeight = height || defaultHeight;

    // Definir dimensiones estándar para asegurar simetría
    const standardWidth = type === "icon" ? 48 : 180;
    const standardHeight = type === "icon" ? 48 : 54;

    return (
        <div
            key={resolvedTheme}
            className={cn("relative flex items-center justify-center overflow-hidden", className)}
            style={{ 
                width: width || standardWidth, 
                height: height || standardHeight 
            }}
        >
            <Image
                src={finalSrc}
                alt={type === "icon" ? `${process.env.NEXT_PUBLIC_APP_NAME || "Ozlo"} Icon` : `${process.env.NEXT_PUBLIC_APP_NAME || "Ozlo"} Logo`}
                fill
                priority={priority}
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 140px"
            />
        </div>
    );
}
