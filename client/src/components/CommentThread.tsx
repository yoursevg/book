import { useState } from "react";
import { MessageSquare, Reply, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// removed unused Textarea import
import { Card, CardContent } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alertDialog";
import UserAvatar from "./UserAvatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { useDarkMode } from "@/hooks/useDarkMode";

// Custom component to handle links properly
const LinkRenderer = ({ href, children, ...props }: any) => {
    // If href doesn't start with http(s) or mailto, add https://
    const safeHref = href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')
        ? `https://${href}`
        : href;
    
    return (
        <a href={safeHref} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
        </a>
    );
};

interface Comment {
    id: string;
    author: string;
    authorAvatar?: string;
    content: string;
    timestamp: string;
    replies?: Comment[];
}

interface CommentThreadProps {
    lineNumber: number;
    comments: Comment[];
    currentUsername?: string | null;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onAddComment?: (content: string) => void;
    onAddReply?: (commentId: string, content: string) => void;
    onEditComment?: (commentId: string, content: string) => void;
    onDeleteComment?: (commentId: string) => void;
    'data-testid'?: string;
}

export default function CommentThread({ lineNumber, comments, currentUsername = null, isCollapsed = false, onToggleCollapse, onAddComment, onAddReply, onEditComment, onDeleteComment, 'data-testid': testId }: CommentThreadProps) {
    const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [replyContent, setReplyContent] = useState<string>("");
    const [newComment, setNewComment] = useState<string>("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState<string>("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: "comment" | "reply"; preview: string } | null>(null);
    const isDark = useDarkMode();

    // Count total comments including replies
    const totalCommentsCount = comments.reduce((total, comment) => 
        total + 1 + (comment.replies?.length || 0), 0);

    const handleAddComment = () => {
        if (newComment.trim()) {
            onAddComment?.(newComment);
            setNewComment("");
            setShowAddForm(false);
            console.log("Added comment to line", lineNumber, ":", newComment);
        }
    };

    const handleAddReply = (commentId: string) => {
        if (replyContent.trim()) {
            onAddReply?.(commentId, replyContent);
            setReplyContent("");
            setShowReplyForm(null);
            console.log("Added reply to comment", commentId, ":", replyContent);
        }
    };

    const openDeleteDialog = (target: { id: string; kind: "comment" | "reply"; preview: string }) => {
        setDeleteTarget(target);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await onDeleteComment?.(deleteTarget.id);
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
        } catch {
            // errors are handled by mutation/toast
        }
    };

    return (
        <>
            <div className="space-y-3" data-testid={testId || `comment-thread-line-${lineNumber}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 p-0"
                    onClick={onToggleCollapse}
                    data-testid={`button-toggle-line-${lineNumber}`}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                    ) : (
                        <ChevronDown className="w-3 h-3" />
                    )}
                </Button>
                <MessageSquare className="w-4 h-4" />
                <span>Line {lineNumber}</span>
                <span>•</span>
                <span>{totalCommentsCount} comment{totalCommentsCount !== 1 ? 's' : ''}</span>
            </div>

            {!isCollapsed && (
                <>
                    {comments.map((comment) => (
                        <Card key={comment.id} className="hover-elevate">
                            <CardContent className="p-4">
                                <div className="flex gap-3">
                                    <UserAvatar name={comment.author} imageUrl={comment.authorAvatar} size="sm" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{comment.author}</span>
                                                <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                                            </div>
                                            {currentUsername && comment.author === currentUsername ? (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-6 h-6"
                                                        onClick={() => {
                                                            if (editingCommentId === comment.id) {
                                                                setEditingCommentId(null);
                                                                setEditingContent("");
                                                            } else {
                                                                setEditingCommentId(comment.id);
                                                                setEditingContent(comment.content);
                                                            }
                                                        }}
                                                        data-testid={`button-edit-${comment.id}`}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-6 h-6"
                                                        onClick={() => openDeleteDialog({
                                                            id: comment.id,
                                                            kind: "comment",
                                                            preview: comment.content,
                                                        })}
                                                        data-testid={`button-delete-${comment.id}`}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <>
                                                <div className="space-y-2" data-color-mode={isDark ? 'dark' : 'light'}>
                                                    <MDEditor
                                                        value={editingContent}
                                                        onChange={(val) => setEditingContent(val || "")}
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
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={async () => {
                                                            const next = editingContent.trim();
                                                            if (!next) return;
                                                            try {
                                                                await onEditComment?.(comment.id, next);
                                                                setEditingCommentId(null);
                                                                setEditingContent("");
                                                            } catch {
                                                                // errors are handled by mutation/toast; keep editor open
                                                            }
                                                        }}
                                                        disabled={!editingContent.trim()}
                                                        data-testid={`button-save-edit-${comment.id}`}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCommentId(null);
                                                            setEditingContent("");
                                                        }}
                                                        data-testid={`button-cancel-edit-${comment.id}`}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{ a: LinkRenderer }}
                                                >
                                                    {comment.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowReplyForm(showReplyForm === comment.id ? null : comment.id)}
                                            className="h-7 px-2 text-xs"
                                            data-testid={`button-reply-${comment.id}`}
                                        >
                                            <Reply className="w-3 h-3 mr-1" />
                                            Reply
                                        </Button>

                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex gap-2">
                                                        <UserAvatar name={reply.author} imageUrl={reply.authorAvatar} size="sm" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-xs">{reply.author}</span>
                                                                    <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
                                                                </div>
                                                                {currentUsername && reply.author === currentUsername ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="w-6 h-6"
                                                                            onClick={() => {
                                                                                if (editingCommentId === reply.id) {
                                                                                    setEditingCommentId(null);
                                                                                    setEditingContent("");
                                                                                } else {
                                                                                    setEditingCommentId(reply.id);
                                                                                    setEditingContent(reply.content);
                                                                                }
                                                                            }}
                                                                            data-testid={`button-edit-${reply.id}`}
                                                                        >
                                                                            <Pencil className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="w-6 h-6"
                                                                            onClick={() => openDeleteDialog({
                                                                                id: reply.id,
                                                                                kind: "reply",
                                                                                preview: reply.content,
                                                                            })}
                                                                            data-testid={`button-delete-${reply.id}`}
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                            {editingCommentId === reply.id ? (
                                                                <>
                                                                    <div className="mt-1 space-y-2" data-color-mode={isDark ? 'dark' : 'light'}>
                                                                        <MDEditor
                                                                            value={editingContent}
                                                                            onChange={(val) => setEditingContent(val || "")}
                                                                            preview="edit"
                                                                            height={140}
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
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={async () => {
                                                                                const next = editingContent.trim();
                                                                                if (!next) return;
                                                                                try {
                                                                                    await onEditComment?.(reply.id, next);
                                                                                    setEditingCommentId(null);
                                                                                    setEditingContent("");
                                                                                } catch {
                                                                                    // errors are handled by mutation/toast; keep editor open
                                                                                }
                                                                            }}
                                                                            disabled={!editingContent.trim()}
                                                                            data-testid={`button-save-edit-${reply.id}`}
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setEditingCommentId(null);
                                                                                setEditingContent("");
                                                                            }}
                                                                            data-testid={`button-cancel-edit-${reply.id}`}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="prose prose-sm dark:prose-invert max-w-none mt-1">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm]}
                                                                        components={{ a: LinkRenderer }}
                                                                    >
                                                                        {reply.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {showReplyForm === comment.id && (
                                            <>
                                                <div className="ml-4 space-y-2" data-color-mode={isDark ? 'dark' : 'light'} data-testid={`textarea-reply-${comment.id}`}>
                                                    <MDEditor
                                                        value={replyContent}
                                                        onChange={(val) => setReplyContent(val || "")}
                                                        preview="edit"
                                                        height={140}
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
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleAddReply(comment.id)} data-testid={`button-submit-reply-${comment.id}`}>
                                                        Reply
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(null)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </>
            )}
            {showAddForm && (
                <div className="space-y-2" data-color-mode={isDark ? 'dark' : 'light'}>
                    <MDEditor
                        value={newComment}
                        onChange={(val) => setNewComment(val || "")}
                        preview="edit"
                        height={180}
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
                    <div className="flex gap-2">
                        <Button onClick={handleAddComment} data-testid={`button-submit-comment-line-${lineNumber}`}>
                            Comment
                        </Button>
                        <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {deleteTarget?.kind === "reply" ? "Удалить ответ?" : "Удалить комментарий?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Это действие нельзя отменить.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            setDeleteDialogOpen(false);
                            setDeleteTarget(null);
                        }}
                    >
                        Отмена
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete}>
                        Удалить
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}