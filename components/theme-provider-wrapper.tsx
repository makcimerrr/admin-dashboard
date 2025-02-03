"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { useEffect, useState } from "react";

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>{children}</>; // Évite l’hydratation incorrecte
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
        </ThemeProvider>
    );
}