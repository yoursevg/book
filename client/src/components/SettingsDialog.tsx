import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateColor, resetDefaults } = useSettings();
  const colors = settings.colors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize the interface to your preference.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
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
