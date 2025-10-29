import { useState } from "react";
import { MessageSquare, X, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CommentThread from "./CommentThread";

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

interface CommentSidebarProps {
    lineComments?: LineComments[];
    isOpen?: boolean;
    onClose?: () => void;
    onAddComment?: (lineNumber: number, content: string) => void;
    onAddReply?: (commentId: string, content: string) => void;
}

export default function CommentSidebar({
                                           lineComments = [],
                                           isOpen = true,
                                           onClose,
                                           onAddComment,
                                           onAddReply
                                       }: CommentSidebarProps) {
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);

    const totalComments = lineComments.reduce((total, lc) =>
        total + lc.comments.length + (lc.comments.reduce((replyTotal, c) =>
            replyTotal + (c.replies?.length || 0), 0)), 0);

    const filteredComments = lineComments.filter(lc => {
        if (searchQuery) {
            return lc.comments.some(comment =>
                comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                comment.author.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return true;
    });

    if (!isOpen) return null;

    return (
        <div className="w-80 border-l border-border bg-card flex flex-col" data-testid="comment-sidebar">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-medium">Comments</span>
                    <Badge variant="secondary" className="ml-1">
                        {totalComments}
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-6 h-6"
                        data-testid="button-collapse-comments"
                    >
                        <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="w-6 h-6"
                        data-testid="button-close-comments"
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            </CardHeader>

            {!isCollapsed && (
                <>
                    <div className="p-4 space-y-3 border-b">
                        <Input
                            placeholder="Search comments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            data-testid="input-search-comments"
                        />

                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="h-8 text-sm" data-testid="select-comment-filter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Comments</SelectItem>
                                    <SelectItem value="unresolved">Unresolved</SelectItem>
                                    <SelectItem value="mine">My Comments</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
                                        onAddComment={(content) => onAddComment?.(lineComment.lineNumber, content)}
                                        onAddReply={onAddReply}
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
                </>
            )}
        </div>
    );
}