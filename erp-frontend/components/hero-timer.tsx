"use client";

import { useEffect, useState } from "react";

export function HeroTimer() {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 60));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <span className="inline-flex items-center justify-center min-w-[1.2em] font-mono text-primary animate-pulse">
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </span>
    );
}
