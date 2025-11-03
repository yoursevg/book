import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/contexts/SettingsContext";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const FONT_OPTIONS = [
    { value: "system-ui", label: "System UI" },
    { value: "Inter", label: "Inter" },
    { value: "Roboto", label: "Roboto" },
    { value: "Open Sans", label: "Open Sans" },
    { value: "Lora", label: "Lora" },
    { value: "Merriweather", label: "Merriweather" },
    { value: "Playfair Display", label: "Playfair Display" },
    { value: "Source Serif 4", label: "Source Serif 4" },
    { value: "Libre Baskerville", label: "Libre Baskerville" },
    { value: "IBM Plex Sans", label: "IBM Plex Sans" },
    { value: "Poppins", label: "Poppins" },
    { value: "Montserrat", label: "Montserrat" },
    { value: "DM Sans", label: "DM Sans" },
    { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
    { value: "Space Grotesk", label: "Space Grotesk" },
    { value: "Outfit", label: "Outfit" },
    { value: "JetBrains Mono", label: "JetBrains Mono" },
    { value: "Fira Code", label: "Fira Code" },
    { value: "Source Code Pro", label: "Source Code Pro" },
    { value: "IBM Plex Mono", label: "IBM Plex Mono" },
    { value: "Roboto Mono", label: "Roboto Mono" },
    { value: "Space Mono", label: "Space Mono" },
    { value: "Geist", label: "Geist" },
    { value: "Geist Mono", label: "Geist Mono" },
];

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { settings, updateColor, updateFont, resetDefaults } = useSettings();
    const colors = settings.colors;
    const font = settings.font;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Customize the interface to your preference.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="colors" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full mb-4">
                        <TabsTrigger value="colors">Colors</TabsTrigger>
                        <TabsTrigger value="font">Font</TabsTrigger>
                        <TabsTrigger value="other" disabled>Other</TabsTrigger>
                    </TabsList>

                    <TabsContent value="colors" className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hoveredLine">Hovered line</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="hoveredLine"
                                        type="color"
                                        value={rgbaToHex(colors.hoveredLine)}
                                        onChange={(e) => updateColor("hoveredLine", e.target.value)}
                                        className="h-9 w-16 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={colors.hoveredLine}
                                        onChange={(e) => updateColor("hoveredLine", e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="selectedLine">Selected line</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="selectedLine"
                                        type="color"
                                        value={rgbaToHex(colors.selectedLine)}
                                        onChange={(e) => updateColor("selectedLine", e.target.value)}
                                        className="h-9 w-16 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={colors.selectedLine}
                                        onChange={(e) => updateColor("selectedLine", e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="highlightedLine">Highlighted line</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="highlightedLine"
                                        type="color"
                                        value={rgbaToHex(colors.highlightedLine)}
                                        onChange={(e) => updateColor("highlightedLine", e.target.value)}
                                        className="h-9 w-16 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={colors.highlightedLine}
                                        onChange={(e) => updateColor("highlightedLine", e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="selectedHighlightedLine">Selected + Highlighted</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="selectedHighlightedLine"
                                        type="color"
                                        value={rgbaToHex(colors.selectedHighlightedLine)}
                                        onChange={(e) => updateColor("selectedHighlightedLine", e.target.value)}
                                        className="h-9 w-16 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={colors.selectedHighlightedLine}
                                        onChange={(e) => updateColor("selectedHighlightedLine", e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="commentDot">Comment indicator</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="commentDot"
                                        type="color"
                                        value={rgbaToHex(colors.commentDot)}
                                        onChange={(e) => updateColor("commentDot", e.target.value)}
                                        className="h-9 w-16 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={colors.commentDot}
                                        onChange={(e) => updateColor("commentDot", e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button variant="outline" onClick={resetDefaults}>Reset to defaults</Button>
                            <Button onClick={() => onOpenChange(false)}>Close</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="font" className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="font-family">Font Family</Label>
                            <Select value={font.family} onValueChange={(value) => updateFont("family", value)}>
                                <SelectTrigger id="font-family">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_OPTIONS.map((fontOption) => (
                                        <SelectItem
                                            key={fontOption.value}
                                            value={fontOption.value}
                                            style={{ fontFamily: fontOption.value }}
                                        >
                                            {fontOption.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Choose the font for document text
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="font-size">Font Size</Label>
                                <span className="text-sm text-muted-foreground">{font.size}px</span>
                            </div>
                            <Slider
                                id="font-size"
                                min={12}
                                max={24}
                                step={1}
                                value={[font.size]}
                                onValueChange={([value]) => updateFont("size", value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="line-height">Line Height</Label>
                                <span className="text-sm text-muted-foreground">{font.lineHeight.toFixed(1)}</span>
                            </div>
                            <Slider
                                id="line-height"
                                min={1.2}
                                max={2.4}
                                step={0.1}
                                value={[font.lineHeight]}
                                onValueChange={([value]) => updateFont("lineHeight", value)}
                            />
                        </div>

                        <div className="rounded-lg border p-4" style={{ fontFamily: font.family }}>
                            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                            <p style={{ fontSize: `${font.size}px`, lineHeight: font.lineHeight }}>
                                The quick brown fox jumps over the lazy dog. This is a preview of how your document text will appear with the current settings.
                            </p>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button variant="outline" onClick={resetDefaults}>Reset to defaults</Button>
                            <Button onClick={() => onOpenChange(false)}>Close</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="other">
                        <div className="text-sm text-muted-foreground">More settings will appear here.</div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// Helpers: convert rgba() or hex-with-alpha strings to hex color inputs when possible.
function rgbaToHex(input: string): string {
    // If already a hex like #rrggbb or #rgb, return as-is when length is 7 or 4
    if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(input)) return input;

    // Try to parse rgba(r,g,b,a) or rgb(r,g,b)
    const m = input.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
    if (m) {
        const r = clamp255(parseInt(m[1], 10));
        const g = clamp255(parseInt(m[2], 10));
        const b = clamp255(parseInt(m[3], 10));
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Fallback to default gray
    return "#888888";
}
function toHex(n: number) {
    return n.toString(16).padStart(2, "0");
}
function clamp255(n: number) {
    return Math.max(0, Math.min(255, n));
}