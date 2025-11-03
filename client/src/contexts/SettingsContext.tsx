import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ColorSettings = {
    hoveredLine: string; // color when cursor hovers a line
    selectedLine: string; // color for selected line(s)
    highlightedLine: string; // color for highlighted (persisted) line
    selectedHighlightedLine: string; // color when a line is both selected and highlighted
    commentDot: string; // color for the small comment indicator dot
};

export type FontSettings = {
    family: string; // font family name
    size: number; // font size in pixels
    lineHeight: number; // line height multiplier
};

export type AppSettings = {
    colors: ColorSettings;
    font: FontSettings;
};

const DEFAULT_SETTINGS: AppSettings = {
    colors: {
        // Try to roughly match the existing Tailwind styles used before
        // hovered: bg-muted/30 (approximate with gray and alpha)
        hoveredLine: "rgba(107,114,128,0.3)", // gray-500 @ 30%
        // selected: bg-primary/10 (approx blue-500 @ 10%)
        selectedLine: "rgba(59,130,246,0.10)", // blue-500 @ 10%
        // highlighted: bg-yellow-200 (dark used yellow-500/40)
        highlightedLine: "#fde68a", // yellow-200
        // selected + highlighted: slightly stronger mix
        selectedHighlightedLine: "#facc15", // yellow-400
        // comment indicator used bg-primary; approximate with blue-500
        commentDot: "#3b82f6", // blue-500
    },
    font: {
        family: "system-ui",
        size: 16,
        lineHeight: 1.6,
    },
};

const SettingsContext = createContext<{
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    updateColor: <K extends keyof ColorSettings>(key: K, value: ColorSettings[K]) => void;
    updateFont: <K extends keyof FontSettings>(key: K, value: FontSettings[K]) => void;
    resetDefaults: () => void;
} | null>(null);

const LS_KEY = "docannotate.settings.v1";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<AppSettings>;
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    colors: { ...DEFAULT_SETTINGS.colors, ...(parsed.colors || {}) },
                    font: { ...DEFAULT_SETTINGS.font, ...(parsed.font || {}) },
                };
            }
        } catch { /* ignore */ }
        return DEFAULT_SETTINGS;
    });

    useEffect(() => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(settings));
        } catch { /* ignore */ }
    }, [settings]);

    const updateColor = useMemo(() => {
        return function <K extends keyof ColorSettings>(key: K, value: ColorSettings[K]) {
            setSettings((prev) => ({
                ...prev,
                colors: {
                    ...prev.colors,
                    [key]: value,
                },
            }));
        };
    }, []);

    const updateFont = useMemo(() => {
        return function <K extends keyof FontSettings>(key: K, value: FontSettings[K]) {
            setSettings((prev) => ({
                ...prev,
                font: {
                    ...prev.font,
                    [key]: value,
                },
            }));
        };
    }, []);

    const resetDefaults = () => setSettings(DEFAULT_SETTINGS);

    const value = useMemo(
        () => ({ settings, setSettings, updateColor, updateFont, resetDefaults }),
        [settings, updateColor, updateFont]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
}

export const defaultSettings = DEFAULT_SETTINGS;