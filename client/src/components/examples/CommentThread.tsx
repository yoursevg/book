import CommentThread from '../CommentThread';
import devAvatar from "@assets/generated_images/Professional_developer_avatar_5eb3cee6.png";
import writerAvatar from "@assets/generated_images/Technical_writer_avatar_3e982c00.png";

export default function CommentThreadExample() {
    const mockComments = [
        {
            id: "1",
            author: "Alex Chen",
            authorAvatar: devAvatar,
            content: "This section needs clarification about error handling. The current implementation doesn't cover edge cases properly.",
            timestamp: "2 hours ago",
            replies: [
                {
                    id: "1-1",
                    author: "Sarah Martinez",
                    authorAvatar: writerAvatar,
                    content: "Good point! I'll add more details about exception scenarios.",
                    timestamp: "1 hour ago",
                }
            ]
        },
        {
            id: "2",
            author: "Jordan Taylor",
            content: "Should we include a code example here?",
            timestamp: "30 minutes ago",
        }
    ];

    return (
        <div className="p-4 max-w-md">
            <CommentThread
                lineNumber={42}
                comments={mockComments}
                onAddComment={(content) => console.log("New comment:", content)}
                onAddReply={(commentId, content) => console.log("Reply to", commentId, ":", content)}
            />
        </div>
    );
}