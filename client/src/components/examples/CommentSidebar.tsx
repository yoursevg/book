import CommentSidebar from '../CommentSidebar';
import devAvatar from "@assets/generated_images/Professional_developer_avatar_5eb3cee6.png";
import writerAvatar from "@assets/generated_images/Technical_writer_avatar_3e982c00.png";
import pmAvatar from "@assets/generated_images/Product_manager_avatar_c02e5002.png";

export default function CommentSidebarExample() {
    const mockLineComments = [
        {
            lineNumber: 5,
            comments: [
                {
                    id: "1",
                    author: "Alex Chen",
                    authorAvatar: devAvatar,
                    content: "This introduction section could be clearer about the protocol's main benefits.",
                    timestamp: "2 hours ago",
                    replies: [
                        {
                            id: "1-1",
                            author: "Sarah Martinez",
                            authorAvatar: writerAvatar,
                            content: "Good point! I'll revise this to highlight the key advantages.",
                            timestamp: "1 hour ago",
                        }
                    ]
                }
            ]
        },
        {
            lineNumber: 12,
            comments: [
                {
                    id: "2",
                    author: "Jordan Taylor",
                    authorAvatar: pmAvatar,
                    content: "Should we include a diagram here to illustrate the peer-to-peer concept?",
                    timestamp: "45 minutes ago",
                }
            ]
        },
        {
            lineNumber: 23,
            comments: [
                {
                    id: "3",
                    author: "Alex Chen",
                    authorAvatar: devAvatar,
                    content: "The definition of AOR needs to be more precise for implementers.",
                    timestamp: "30 minutes ago",
                }
            ]
        }
    ];

    return (
        <div className="h-96 flex">
            <div className="flex-1 bg-background p-4">
                <p className="text-muted-foreground">Document content area</p>
            </div>
            <CommentSidebar
                lineComments={mockLineComments}
                isOpen={true}
                onClose={() => console.log("Close comments")}
                onAddComment={(line, content) => console.log("Add comment to line", line, ":", content)}
                onAddReply={(commentId, content) => console.log("Reply to", commentId, ":", content)}
            />
        </div>
    );
}