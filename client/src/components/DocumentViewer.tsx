import { useState, useMemo, useCallback, memo } from "react";
import { MessageSquare, Highlighter, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";

interface LineComment {
    id: string;
    lineNumber: number;
    count: number;
}

interface DocumentViewerProps {
    content: string;
    highlights?: number[];
    comments?: LineComment[];
    onLineSelect?: (lineNumber: number) => void;
    onAddComment?: (lineNumber: number) => void;
    onHighlightToggle?: (lineNumbers: number[]) => void;
}

export default function DocumentViewer({
                                           content,
                                           highlights = [],
                                           comments = [],
                                           onLineSelect,
                                           onAddComment,
                                           onHighlightToggle
                                       }: DocumentViewerProps) {
    const [selectedLines, setSelectedLines] = useState<number[]>([]);
    const { settings } = useSettings();
    const colors = settings.colors;
    const font = settings.font;

    // Memoize derived structures to avoid re-computation on each render
    const lines = useMemo(() => content.split('\n'), [content]);
    const commentsByLine = useMemo(() => new Map(comments.map(c => [c.lineNumber, c])), [comments]);
    const highlightSet = useMemo(() => new Set(highlights), [highlights]);

    const handleLineClick = useCallback((lineNumber: number, event: React.MouseEvent) => {
        event.preventDefault();

        if (event.shiftKey && selectedLines.length > 0) {
            // Range selection (contiguous): from last selected to clicked
            const lastSelected = selectedLines[selectedLines.length - 1];
            const start = Math.min(lastSelected, lineNumber);
            const end = Math.max(lastSelected, lineNumber);
            const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            setSelectedLines(range);
        } else {
            // Toggle selection on simple click (no Ctrl/Cmd required)
            setSelectedLines(prev =>
                prev.includes(lineNumber)
                    ? prev.filter(n => n !== lineNumber)
                    : [...prev, lineNumber]
            );
        }

        onLineSelect?.(lineNumber);
    }, [onLineSelect, selectedLines]);

    const handleAddComment = useCallback((lineNumber: number, event: React.MouseEvent) => {
        event.stopPropagation();
        onAddComment?.(lineNumber);
    }, [onAddComment]);

    const getLineComment = useCallback((lineNumber: number) => {
        return commentsByLine.get(lineNumber);
    }, [commentsByLine]);

    const isLineHighlighted = useCallback((lineNumber: number) => {
        return highlightSet.has(lineNumber);
    }, [highlightSet]);

    const isLineSelected = useCallback((lineNumber: number) => {
        return selectedLines.includes(lineNumber);
    }, [selectedLines]);

    return (
        <div className="flex-1 overflow-auto" data-testid="document-viewer">
            <div className="relative">
                <div
                    className="space-y-0 text-sm"
                    style={{
                        fontSize: `${font.size}px`,
                        lineHeight: font.lineHeight,
                        fontFamily: font.family
                    }}
                >
                    {lines.map((line, index) => {
                        const lineNumber = index + 1;
                        const lineComment = getLineComment(lineNumber);
                        const isHighlighted = isLineHighlighted(lineNumber);
                        const isSelected = isLineSelected(lineNumber);

                        return (
                            <LineRow
                                key={lineNumber}
                                lineNumber={lineNumber}
                                text={line}
                                isHighlighted={isHighlighted}
                                isSelected={isSelected}
                                commentCount={lineComment?.count}
                                colors={colors}
                                onLineClick={handleLineClick}
                                onAddComment={handleAddComment}
                            />
                        );
                    })}
                </div>

                {/* Selection toolbar
                    - Highlight: adds highlight only to non-highlighted selected lines
                    - Unhighlight: removes highlight only from highlighted selected lines
                    - Cancel: clears current selection without changing highlights
                    To rename or restyle these buttons later, edit this block. */}
                {selectedLines.length > 0 && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-card border rounded-lg shadow-lg p-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {selectedLines.length === 1
                                ? `Line ${selectedLines[0]} selected`
                                : `${selectedLines.length} lines selected`
                            }
                        </span>
                        <Button
                            size="sm"
                            onClick={() => {
                                const toHighlight = selectedLines.filter(n => !highlights.includes(n));
                                if (toHighlight.length > 0) {
                                    onHighlightToggle?.(toHighlight);
                                }
                                setSelectedLines([]);
                            }}
                            data-testid="button-highlight-selection"
                        >
                            <Highlighter className="w-4 h-4 mr-1" />
                            Highlight
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                const toUnhighlight = selectedLines.filter(n => highlights.includes(n));
                                if (toUnhighlight.length > 0) {
                                    onHighlightToggle?.(toUnhighlight);
                                }
                                setSelectedLines([]);
                            }}
                            data-testid="button-unhighlight-selection"
                        >
                            <Eraser className="w-4 h-4 mr-1" />
                            Unhighlight
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLines([])}
                            data-testid="button-clear-selection"
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Memoized line row to avoid re-rendering unrelated lines
interface LineRowProps {
    lineNumber: number;
    text: string;
    isHighlighted: boolean;
    isSelected: boolean;
    commentCount?: number;
    colors: {
        selectedHighlightedLine: string;
        selectedLine: string;
        highlightedLine: string;
        hoveredLine: string;
        commentDot: string;
    };
    onLineClick: (lineNumber: number, event: React.MouseEvent) => void;
    onAddComment: (lineNumber: number, event: React.MouseEvent) => void;
}

const LineRow = memo(function LineRow({
    lineNumber,
    text,
    isHighlighted,
    isSelected,
    commentCount,
    colors,
    onLineClick,
    onAddComment,
}: LineRowProps) {
    const bgColor = (
        isSelected && isHighlighted
            ? colors.selectedHighlightedLine
            : isSelected
                ? colors.selectedLine
                : isHighlighted
                    ? colors.highlightedLine
                    : undefined
    );

    return (
        <div
            className={"flex group relative motion-safe:transition-colors"}
            style={bgColor ? { backgroundColor: bgColor, ['--hoveredLineColor' as any]: colors.hoveredLine } : { ['--hoveredLineColor' as any]: colors.hoveredLine }}
            data-testid={`line-${lineNumber}`}
        >
            {/* Line number gutter */}
            <div
                className="w-16 flex-shrink-0 bg-muted/50 text-muted-foreground text-right pr-4 py-1 border-r border-border cursor-pointer select-none hover:bg-muted"
                onClick={(e) => onLineClick(lineNumber, e)}
                data-testid={`line-number-${lineNumber}`}
            >
                {lineNumber}
            </div>

            {/* Line content */}
            <div
                className="flex-1 px-4 py-1 cursor-text hover:bg-[color:var(--hoveredLineColor,transparent)]"
                onClick={(e) => onLineClick(lineNumber, e)}
            >
                <span className="whitespace-pre-wrap">{text || " "}</span>
            </div>

            {/* Comment indicators and actions */}
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
                {typeof commentCount === 'number' && (
                    <div className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors.commentDot }}
                            data-testid={`comment-indicator-${lineNumber}`}
                        />
                        <span className="text-xs text-muted-foreground">
                            {commentCount}
                        </span>
                    </div>
                )}

                {(!commentCount) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => onAddComment(lineNumber, e)}
                        data-testid={`button-add-comment-${lineNumber}`}
                    >
                        <MessageSquare className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    );
});