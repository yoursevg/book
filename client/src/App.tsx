import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import NavigationSidebar from "./components/NavigationSidebar";
import DocumentViewer from "./components/DocumentViewer";
import CommentSidebar from "./components/CommentSidebar";
import DocumentUpload from "./components/DocumentUpload";
import ThemeToggle from "./components/ThemeToggle";
import SettingsDialog from "./components/SettingsDialog";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { MessageSquare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Document, Comment, Highlight } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import UserMenu from "@/components/UserMenu";
import { useMeQuery } from "@/hooks/useAuth";

function DocumentAnnotationApp() {
    const [activeDocument, setActiveDocument] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showComments, setShowComments] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingCommentLine, setPendingCommentLine] = useState<number | null>(null);

    const { toast } = useToast();
    const { data: me } = useMeQuery();

    const { data: documents = [], refetch: refetchDocuments } = useQuery<Document[]>({
        queryKey: ["/api/documents"],
    });

    const { data: currentDocument } = useQuery<Document>({
        queryKey: ["/api/documents", activeDocument],
        enabled: !!activeDocument,
    });

    const { data: comments = [] } = useQuery<Comment[]>({
        queryKey: ["/api/documents", activeDocument, "comments"],
        enabled: !!activeDocument,
    });

    const { data: highlights = [] } = useQuery<Highlight[]>({
        queryKey: ["/api/documents", activeDocument, "highlights"],
        enabled: !!activeDocument,
    });

    const uploadDocumentMutation = useMutation({
        mutationFn: async (data: { name: string; content: string; type: string }) => {
            const res = await apiRequest("POST", "/api/documents", data);
            return await res.json() as Document;
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
            setActiveDocument(newDoc.id);
            setShowUpload(false);
            toast({
                title: "Document uploaded",
                description: `${newDoc.name} has been uploaded successfully.`,
            });
        },
        onError: (error: Error) => {
            if (!error.message.includes("401")) {
                toast({
                    title: "Upload failed",
                    description: "Failed to upload document. Please try again.",
                    variant: "destructive",
                });
            }
        },
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("DELETE", `/api/documents/${id}`);
            return await res.json();
        },
        onSuccess: (_, deletedId) => {
            queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
            if (activeDocument === deletedId) {
                setActiveDocument(null);
            }
            toast({
                title: "Документ удален",
                description: "Документ успешно удален",
            });
        },
        onError: (error: Error) => {
            if (!error.message.startsWith("401")) {
                toast({
                    title: "Ошибка",
                    description: "Не удалось удалить документ",
                    variant: "destructive",
                });
            }
        },
    });

    const addCommentMutation = useMutation({
        mutationFn: async (data: { documentId: string; lineNumber: number; author: string; content: string; parentCommentId?: string }) => {
            const res = await apiRequest("POST", "/api/comments", data);
            return await res.json() as Comment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/documents", activeDocument, "comments"] });
            setPendingCommentLine(null);
        },
        onError: (error: Error) => {
            if (!error.message.includes("401")) {
                toast({
                    title: "Ошибка",
                    description: "Не удалось добавить комментарий",
                    variant: "destructive",
                });
            }
        },
    });

    const toggleHighlightMutation = useMutation({
        mutationFn: async (data: { documentId: string; lineNumber: number }) => {
            const res = await apiRequest("POST", "/api/highlights/toggle", data);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/documents", activeDocument, "highlights"] });
        },
        onError: (error: Error) => {
            if (!error.message.includes("401")) {
                toast({
                    title: "Ошибка",
                    description: "Не удалось изменить выделение",
                    variant: "destructive",
                });
            }
        },
    });

    const handleDocumentSelect = (documentId: string) => {
        setActiveDocument(documentId);
    };

    const handleUploadClick = () => {
        setShowUpload(true);
    };

    const handleSearch = (query: string) => {
        console.log("Search query:", query);
    };

    const handleFileUpload = async (file: File) => {
        const content = await file.text();
        const type = file.type === "application/pdf" ? "pdf" : "txt";
        uploadDocumentMutation.mutate({
            name: file.name,
            content,
            type,
        });
    };

    const handleDeleteDocument = (id: string) => {
        deleteDocumentMutation.mutate(id);
    };

    const handleUrlImport = async (url: string) => {
        try {
            const res = await apiRequest("POST", "/api/documents/import-url", { url });
            const newDoc = (await res.json()) as Document;
            await queryClient.invalidateQueries({queryKey: ["/api/documents"]});
            setActiveDocument(newDoc.id);
            setShowUpload(false);
            toast({
                title: "Document imported",
                description: `${newDoc.name} has been imported successfully.`,
            });
        } catch (error) {
            if (error instanceof Error && !error.message.includes("401")) {
                toast({
                    title: "Import failed",
                    description: "Failed to import document from URL. Please ensure it's a public TXT file and try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleLineSelect = (lineNumber: number) => {
        console.log("Line selected:", lineNumber);
    };

    const handleAddComment = (lineNumber: number) => {
        setPendingCommentLine(lineNumber);
    };

    const handleCancelPendingComment = () => {
        setPendingCommentLine(null);
    };

    const handleHighlightToggle = (lineNumbers: number[]) => {
        if (!activeDocument) return;
        lineNumbers.forEach((lineNumber) => {
            toggleHighlightMutation.mutate({
                documentId: activeDocument,
                lineNumber,
            });
        });
    };

    const handleAddReply = (commentId: string, content: string) => {
        if (!activeDocument) return;
        const parentComment = comments.find((c) => c.id === commentId);
        if (parentComment) {
            addCommentMutation.mutate({
                documentId: activeDocument,
                lineNumber: parentComment.lineNumber,
                author: me?.username ?? "Anonymous",
                content,
                parentCommentId: commentId,
            });
        }
    };

    const formattedDocuments = documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type as "pdf" | "txt" | "url",
        lastModified: formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true }),
    }));

    const groupedComments = comments.reduce((acc, comment) => {
        if (comment.parentCommentId) return acc;

        const lineNumber = comment.lineNumber;
        if (!acc[lineNumber]) {
            acc[lineNumber] = [];
        }

        const replies = comments.filter((c) => c.parentCommentId === comment.id).map((reply) => ({
            id: reply.id,
            author: reply.author,
            content: reply.content,
            timestamp: formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true }),
        }));

        acc[lineNumber].push({
            id: comment.id,
            author: comment.author,
            content: comment.content,
            timestamp: formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }),
            replies,
        });

        return acc;
    }, {} as Record<number, any[]>);

    const lineComments = Object.entries(groupedComments).map(([lineNumber, comments]) => ({
        lineNumber: parseInt(lineNumber),
        comments,
    }));

    const highlightedLines = highlights.map((h) => h.lineNumber);

    if (showUpload) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold">Upload Document</h1>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowUpload(false)}
                                data-testid="button-back-to-documents"
                            >
                                Back to Documents
                            </Button>
                            <ThemeToggle />
                            <UserMenu />
                        </div>
                    </div>
                    <DocumentUpload
                        onFileUpload={handleFileUpload}
                        onUrlImport={handleUrlImport}
                    />
                </div>
            </div>
        );
    }

    if (!activeDocument && documents.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <div className="max-w-2xl w-full text-center">
                    <h1 className="text-3xl font-bold mb-4">Welcome to DocAnnotate</h1>
                    <p className="text-muted-foreground mb-8">
                        Get started by uploading your first document
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <Button onClick={handleUploadClick} data-testid="button-upload-first">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                        </Button>
                        <ThemeToggle />
                        <UserMenu />
                    </div>
                    <DocumentUpload
                        onFileUpload={handleFileUpload}
                        onUrlImport={handleUrlImport}
                    />
                </div>
            </div>
        );
    }

    if (!activeDocument && documents.length > 0) {
        setActiveDocument(documents[0].id);
    }

    return (
        <div className="flex h-screen w-full">
            <NavigationSidebar
                documents={formattedDocuments}
                activeDocument={activeDocument || undefined}
                onDocumentSelect={handleDocumentSelect}
                onUploadClick={handleUploadClick}
                onSearch={handleSearch}
                onOpenSettings={() => setShowSettings(true)}
                onDeleteDocument={handleDeleteDocument}
            />

            <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-4 border-b">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowComments(!showComments)}
                            data-testid="button-toggle-comments"
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Comments
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUploadClick}
                            data-testid="button-header-upload"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                        </Button>
                        <ThemeToggle />
                        <UserMenu />
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden">
                    {currentDocument && (
                        <DocumentViewer
                            content={currentDocument.content}
                            highlights={highlightedLines}
                            comments={lineComments.map((lc) => ({
                                id: lc.lineNumber.toString(),
                                lineNumber: lc.lineNumber,
                                count: lc.comments.length,
                            }))}
                            onLineSelect={handleLineSelect}
                            onAddComment={handleAddComment}
                            onHighlightToggle={handleHighlightToggle}
                        />
                    )}

                    <CommentSidebar
                        lineComments={lineComments}
                        isOpen={showComments}
                        onClose={() => setShowComments(false)}
                        onAddComment={(lineNumber, content) => {
                            if (activeDocument) {
                                addCommentMutation.mutate({
                                    documentId: activeDocument,
                                    lineNumber,
                                    author: me?.username ?? "Anonymous",
                                    content,
                                });
                            }
                        }}
                        onAddReply={handleAddReply}
                        pendingCommentLine={pendingCommentLine}
                        onCancelPendingComment={handleCancelPendingComment}
                    />
                </main>
            </div>
            <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
        </div>
    );
}

function Router() {
    return (
        <Switch>
            <Route path="/" component={DocumentAnnotationApp} />
            <Route component={NotFound} />
        </Switch>
    );
}

function App() {
    const style = {
        "--sidebar-width": "20rem",
        "--sidebar-width-icon": "4rem",
    };

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <SettingsProvider>
                    <SidebarProvider style={style as React.CSSProperties}>
                        <Router />
                    </SidebarProvider>
                    <Toaster />
                </SettingsProvider>
            </TooltipProvider>
        </QueryClientProvider>
    );
}

export default App;
