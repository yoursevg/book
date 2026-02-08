import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, ChevronLeft, ChevronRight, GripVertical, Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import CommentThread from "./CommentThread";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { useDarkMode } from "@/hooks/useDarkMode";

interface Comment {
    id: string;
    author: string;
    authorAvatar?: string;
    content: string;
    timestamp: string;
    replies?: Comment[];
}

interface LineComments {
    lineNumber: number;
    comments: Comment[];
}

interface RelationSpanDto {
    id: string;
    relationId: string;
    startLine: number;
    endLine: number;
}

interface RelationDto {
    id: string;
    documentId: string;
    url: string;
    note: string | null;
    createdAt: string;
    spans: RelationSpanDto[];
}

interface CommentSidebarProps {
    lineComments?: LineComments[];
    relations?: RelationDto[];
    onAddComment?: (lineNumber: number, content: string) => void;
    onAddReply?: (commentId: string, content: string) => void;
    pendingCommentLine?: number | null;
    onCancelPendingComment?: () => void;

    pendingRelationLines?: number[] | null;
    onCancelPendingRelation?: () => void;
    onCreateRelation?: (url: string, note: string | undefined, spans: { startLine: number; endLine: number }[]) => void;
    onDeleteRelation?: (relationId: string) => void;
    toSpans?: (lines: number[]) => { startLine: number; endLine: number }[];
    activeTab?: 'comments' | 'links';
    onTabChange?: (tab: 'comments' | 'links') => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
const COLLAPSED_WIDTH = 48;

export default function CommentSidebar({
    lineComments = [],
    relations = [],
    onAddComment,
    onAddReply,
    pendingCommentLine = null,
    onCancelPendingComment,
    pendingRelationLines = null,
    onCancelPendingRelation,
    onCreateRelation,
    onDeleteRelation,
    toSpans,
    activeTab = 'comments',
    onTabChange
}: CommentSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isExpanded, setIsExpanded] = useState(true);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [newCommentContent, setNewCommentContent] = useState("");
    const [currentTab, setCurrentTab] = useState<'comments' | 'links'>(activeTab);

    const [collapsedLines, setCollapsedLines] = useState<Set<number>>(new Set());

    const [relationUrl, setRelationUrl] = useState("");
    const [relationNote, setRelationNote] = useState("");

    const sidebarRef = useRef<HTMLDivElement>(null);
    const resizeHandleRef = useRef<HTMLDivElement>(null);
    const newCommentRef = useRef<HTMLDivElement>(null);
    const isDark = useDarkMode();

    const totalComments = lineComments.reduce((total, lc) =>
        total + lc.comments.length + (lc.comments.reduce((replyTotal, c) =>
            replyTotal + (c.replies?.length || 0), 0)), 0);

    const totalRelations = relations.length;

    const filteredComments = lineComments.filter(lc => {
        if (searchQuery) {
            return lc.comments.some(comment =>
                comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                comment.author.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return true;
    });

    const toggleLineCollapse = (lineNumber: number) => {
        setCollapsedLines(prev => {
            const next = new Set(prev);
            if (next.has(lineNumber)) {
                next.delete(lineNumber);
            } else {
                next.add(lineNumber);
            }
            return next;
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !sidebarRef.current) return;

            const sidebarRect = sidebarRef.current.getBoundingClientRect();
            const newWidth = sidebarRect.right - e.clientX;

            if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Sync internal tab state with external prop
    useEffect(() => {
        if (activeTab && activeTab !== currentTab) {
            console.log('Updating tab from', currentTab, 'to', activeTab);
            setCurrentTab(activeTab);
        }
    }, [activeTab, currentTab]);
    // Scroll new comment editor into view when pendingCommentLine changes

    useEffect(() => {
        if (pendingCommentLine !== null && newCommentRef.current) {
            newCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [pendingCommentLine]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            setWidth(DEFAULT_WIDTH);
        }
    };

    const handleToggleLineCollapse = (lineNumber: number) => {
        toggleLineCollapse(lineNumber);
    };

    const handleSubmitComment = () => {
        if (pendingCommentLine !== null && newCommentContent.trim()) {
            onAddComment?.(pendingCommentLine, newCommentContent.trim());
            setNewCommentContent("");
            onCancelPendingComment?.();
            // Switch to comments tab when adding a new comment
            onTabChange?.('comments');
        }
    };

    const handleCancelComment = () => {
        setNewCommentContent("");
        onCancelPendingComment?.();
    };

    const handleCreateRelation = () => {
        if (!pendingRelationLines || pendingRelationLines.length === 0) return;
        const url = relationUrl.trim();
        if (!url) return;
        const spans = (toSpans ? toSpans(pendingRelationLines) : []);
        if (spans.length === 0) return;
        const note = relationNote.trim() ? relationNote.trim() : undefined;
        onCreateRelation?.(url, note, spans);
        setRelationUrl("");
        setRelationNote("");
        // Switch to links tab when creating a new relation
        onTabChange?.('links');
    };

    const handleCancelRelation = () => {
        setRelationUrl("");
        setRelationNote("");
        onCancelPendingRelation?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmitComment();
        } else if (e.key === 'Escape') {
            handleCancelComment();
        }
    };

    const currentWidth = isExpanded ? width : COLLAPSED_WIDTH;

    return (
        <div
            ref={sidebarRef}
            className={cn(
                "relative border-l border-border bg-card flex flex-col transition-all",
                isResizing ? "transition-none" : "duration-300 ease-in-out"
            )}
            style={{ width: `${currentWidth}px` }}
            data-testid="comment-sidebar"
        >
            {/* Resize Handle */}
            {isExpanded && (
                <div
                    ref={resizeHandleRef}
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors group z-20"
                    onMouseDown={handleResizeStart}
                    data-testid="resize-handle"
                >
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-6 w-6 text-muted-foreground" />
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-4 z-10 -translate-x-1/2 rounded-full border bg-background shadow-md hover:bg-accent w-6 h-6"
                onClick={handleToggleExpand}
                data-testid="button-toggle-sidebar"
            >
                {isExpanded ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <ChevronLeft className="h-3 w-3" />
                )}
            </Button>

            {/* Collapsed State */}
            {!isExpanded && (
                <div className="flex h-full flex-col items-center justify-start pt-16 gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleExpand}
                        data-testid="button-expand-comments"
                    >
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                    {totalComments > 0 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {totalComments}
                        </div>
                    )}
                </div>
            )}

            {/* Expanded State */}
            {isExpanded && (
                <>
                    <Tabs value={currentTab} className="flex flex-col flex-1 min-h-0" onValueChange={(value) => {
                        const newTab = value as 'comments' | 'links';
                        console.log('Tab changed to:', newTab);
                        setCurrentTab(newTab);
                        onTabChange?.(newTab);
                    }}>
                        <div className="px-4 pt-4">
                            <TabsList className="grid grid-cols-2 w-full">
                                <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
                                <TabsTrigger value="links" data-testid="tab-links">Links</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="comments" className="flex flex-col flex-1 min-h-0 data-[state=active]:flex data-[state=inactive]:hidden">
                            {/* New Comment Form */}
                            {pendingCommentLine !== null && (
                                <div className="p-4 border-b bg-accent/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            New comment on line {pendingCommentLine}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCancelComment}
                                            className="h-6 w-6"
                                            data-testid="button-cancel-new-comment"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div ref={newCommentRef} data-color-mode={isDark ? 'dark' : 'light'} onKeyDown={handleKeyDown} tabIndex={-1}>
                                        <div className="rounded-md border bg-background">
                                            <MDEditor
                                                value={newCommentContent}
                                                onChange={(val) => setNewCommentContent(val || "")}
                                                preview="edit"
                                                height={160}
                                                commands={[
                                                    commands.bold,
                                                    commands.italic,
                                                    commands.strikethrough,
                                                    commands.divider,
                                                    commands.group([
                                                        commands.heading1,
                                                        commands.heading2,
                                                        commands.heading3,
                                                        commands.heading4,
                                                        commands.heading5,
                                                        commands.heading6,
                                                    ], {
                                                        name: 'title',
                                                        groupName: 'title',
                                                        buttonProps: { 'aria-label': 'Insert title' }
                                                    }),
                                                    commands.divider,
                                                    commands.link,
                                                    commands.code,
                                                    commands.quote,
                                                    commands.unorderedListCommand,
                                                    commands.orderedListCommand,
                                                    commands.checkedListCommand,
                                                ]}
                                                extraCommands={[]}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCancelComment}
                                            data-testid="button-cancel-comment"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSubmitComment}
                                            disabled={!newCommentContent.trim()}
                                            data-testid="button-submit-comment"
                                        >
                                            <Send className="w-3 h-3 mr-2" />
                                            Comment
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 space-y-3 border-b">
                                <Input
                                    placeholder="Search comments..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    data-testid="input-search-comments"
                                />
                            </div>

                            <div className="flex-1 overflow-auto">
                                {filteredComments.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p className="text-sm">
                                            {searchQuery ? "No comments match your search" : "No comments yet"}
                                        </p>
                                        {!searchQuery && (
                                            <p className="text-xs mt-1">
                                                Select text in the document to add comments
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-6">
                                        {filteredComments.map((lineComment) => (
                                            <CommentThread
                                                key={lineComment.lineNumber}
                                                lineNumber={lineComment.lineNumber}
                                                comments={lineComment.comments}
                                                isCollapsed={collapsedLines.has(lineComment.lineNumber)}
                                                onToggleCollapse={() => handleToggleLineCollapse(lineComment.lineNumber)}
                                                onAddComment={(content) => onAddComment?.(lineComment.lineNumber, content)}
                                                onAddReply={onAddReply}
                                                data-testid={`comment-thread-${lineComment.lineNumber}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t bg-muted/30">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{filteredComments.length} thread{filteredComments.length !== 1 ? 's' : ''}</span>
                                    <span>{totalComments} total comment{totalComments !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="links" className="flex flex-col flex-1 min-h-0 data-[state=active]:flex data-[state=inactive]:hidden">
                            {pendingRelationLines && pendingRelationLines.length > 0 && (
                                <div className="p-4 border-b bg-accent/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            New link for {pendingRelationLines.length} line{pendingRelationLines.length !== 1 ? 's' : ''}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCancelRelation}
                                            className="h-6 w-6"
                                            data-testid="button-cancel-new-relation"
                                        >
                                            <X className="h-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="https://jira.example.com/browse/ABC-123"
                                            value={relationUrl}
                                            onChange={(e) => setRelationUrl(e.target.value)}
                                            data-testid="input-relation-url"
                                        />
                                        <Input
                                            placeholder="Note (optional)"
                                            value={relationNote}
                                            onChange={(e) => setRelationNote(e.target.value)}
                                            data-testid="input-relation-note"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCancelRelation}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleCreateRelation}
                                            disabled={!relationUrl.trim()}
                                            data-testid="button-create-relation"
                                        >
                                            Save link
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto">
                                {totalRelations === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <p className="text-sm">No links yet</p>
                                        <p className="text-xs mt-1">Select lines in the document and press Link</p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-3">
                                        {relations.map((r) => (
                                            <div key={r.id} className="rounded-md border p-3 space-y-2" data-testid={`relation-${r.id}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <a
                                                            href={r.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-medium truncate hover:text-primary transition-colors flex items-center gap-1"
                                                        >
                                                            {r.url}
                                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                        </a>
                                                        {r.note && (
                                                            <div className="text-xs text-muted-foreground break-words">{r.note}</div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-6 h-6"
                                                        onClick={() => onDeleteRelation?.(r.id)}
                                                        data-testid={`button-delete-relation-${r.id}`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {(r.spans || []).map((s) => `L${s.startLine}–${s.endLine}`).join(", ")}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}