'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-10 h-10 rounded-full bg-foreground/5 animate-pulse"></div>;
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 sm:w-10 sm:h-10 rounded-full bg-card border border-border hover:border-white/30 flex items-center justify-center transition-all text-slate-400 hover:text-foreground"
            aria-label="Toggle dark mode"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5 text-slate-900" />
            )}
        </button>
    );
}
