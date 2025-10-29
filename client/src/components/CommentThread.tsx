import { useState } from "react";
import { MessageSquare, Reply, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import UserAvatar from "./UserAvatar";

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
    onAddComment?: (content: string) => void;
    onAddReply?: (commentId: string, content: string) => void;
}

export default function CommentThread({ lineNumber, comments, onAddComment, onAddReply }: CommentThreadProps) {
    const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [newComment, setNewComment] = useState("");

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

    return (
        <div className="space-y-3" data-testid={`comment-thread-line-${lineNumber}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>Line {lineNumber}</span>
                <span>•</span>
                <span>{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
            </div>

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
                                    <Button variant="ghost" size="icon" className="w-6 h-6">
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-sm">{comment.content}</p>
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
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-xs">{reply.author}</span>
                                                        <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
                                                    </div>
                                                    <p className="text-xs mt-1">{reply.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {showReplyForm === comment.id && (
                                    <div className="ml-4 space-y-2">
                                        <Textarea
                                            placeholder="Write a reply..."
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            className="min-h-[60px] text-sm"
                                            data-testid={`textarea-reply-${comment.id}`}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleAddReply(comment.id)} data-testid={`button-submit-reply-${comment.id}`}>
                                                Reply
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(null)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {!showAddForm && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                    data-testid={`button-add-comment-line-${lineNumber}`}
                >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add comment
                </Button>
            )}

            {showAddForm && (
                <Card>
                    <CardContent className="p-4 space-y-3">
                        <Textarea
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px]"
                            data-testid={`textarea-new-comment-line-${lineNumber}`}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleAddComment} data-testid={`button-submit-comment-line-${lineNumber}`}>
                                Comment
                            </Button>
                            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}