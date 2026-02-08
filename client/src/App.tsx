import { useState, useRef } from "react";
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
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Document, Comment, Highlight } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import UserMenu from "@/components/UserMenu";
import { useMeQuery } from "@/hooks/useAuth";

type RelationSpanDto = {
    id: string;
    relationId: string;
    startLine: number;
    endLine: number;
};

type RelationDto = {
    id: string;
    documentId: string;
    url: string;
    note: string | null;
    createdAt: string;
    spans: RelationSpanDto[];
};

function DocumentAnnotationApp() {
    const [activeDocument, setActiveDocument] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingCommentLine, setPendingCommentLine] = useState<number | null>(null);
    const [pendingRelationLines, setPendingRelationLines] = useState<number[] | null>(null);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'comments' | 'links'>('comments');
    const commentSidebarRef = useRef<HTMLDivElement>(null);

    const { toast } = useToast();
    const { data: me } = useMeQuery();

    const { data: documents = [], refetch: refetchDocuments } = useQuery<Document[]>({
        queryKey: ["/api/documents"],
    });

    const updateCommentMutation = useMutation({
        mutationFn: async (data: { id: string; content: string }) => {
            const res = await apiRequest("PUT", `/api/comments/${data.id}`, { content: data.content });
            return await res.json() as Comment;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["/api/documents", activeDocument, "comments"] });
            toast({
                title: "Комментарий обновлен",
                description: "Изменения сохранены",
            });
        },
        onError: (error: Error) => {
            if (error.message.includes("401") || error.message.includes("403")) return;
            toast({
                title: "Ошибка",
                description: error.message.replace(/^\d+:\s*/, "") || "Не удалось обновить комментарий",
                variant: "destructive",
            });
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("DELETE", `/api/comments/${id}`);
            return res;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["/api/documents", activeDocument, "comments"] });
            toast({
                title: "Комментарий удален",
                description: "Комментарий успешно удален",
            });
        },
        onError: (error: Error) => {
            if (error.message.includes("401") || error.message.includes("403")) return;

            if (error.message.startsWith("409:")) {
                toast({
                    title: "Нельзя удалить комментарий",
                    description: "Сначала удалите ответы к этому комментарию, затем попробуйте снова.",
                    variant: "destructive",
                });
                return;
            }
            toast({
                title: "Ошибка",
                description: error.message.replace(/^\d+:\s*/, "") || "Не удалось удалить комментарий",
                variant: "destructive",
            });
        },
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

    const { data: relations = [] } = useQuery<RelationDto[]>({
        queryKey: ["/api/documents", activeDocument, "relations"],
        enabled: !!activeDocument,
    });

    const createRelationMutation = useMutation({
        mutationFn: async (data: { documentId: string; url: string; note?: string; spans: { startLine: number; endLine: number }[] }) => {
            const res = await apiRequest("POST", "/api/relations", data);
            return await res.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["/api/documents", activeDocument, "relations"] });
            setPendingRelationLines(null);
            toast({
                title: "Link created",
                description: "Связь сохранена",
            });
        },
        onError: () => {
            toast({
                title: "Ошибка",
                description: "Не удалось сохранить связь",
                variant: "destructive",
            });
        }
    });

    const deleteRelationMutation = useMutation({
        mutationFn: async (relationId: string) => {
            const res = await apiRequest("DELETE", `/api/relations/${relationId}`);
            return res;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["/api/documents", activeDocument, "relations"] });
        }
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
        mutationFn: async (data: { documentId: string; lineNumber: number; content: string; parentCommentId?: string }) => {
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
        // Switch to comments tab when adding a new comment
        setActiveSidebarTab('comments');
    };

    const handleCancelPendingComment = () => {
        setPendingCommentLine(null);
    };

    const handleCancelPendingRelation = () => {
        setPendingRelationLines(null);
    };

    const toSpans = (lines: number[]): { startLine: number; endLine: number }[] => {
        const sorted = Array.from(new Set(lines)).sort((a, b) => a - b);
        if (sorted.length === 0) return [];
        const spans: { startLine: number; endLine: number }[] = [];
        let start = sorted[0];
        let prev = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            const cur = sorted[i];
            if (cur === prev + 1) {
                prev = cur;
                continue;
            }
            spans.push({ startLine: start, endLine: prev });
            start = cur;
            prev = cur;
        }
        spans.push({ startLine: start, endLine: prev });
        return spans;
    };

    const relationCountsByLine = (() => {
        const counts = new Map<number, number>();
        for (const rel of relations) {
            for (const span of rel.spans || []) {
                for (let ln = span.startLine; ln <= span.endLine; ln++) {
                    counts.set(ln, (counts.get(ln) ?? 0) + 1);
                }
            }
        }
        return counts;
    })();

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
                content,
                parentCommentId: commentId,
            });
        }
    };

    const handleScrollToComment = (lineNumber: number) => {
        console.log('Switching to comments tab for line:', lineNumber);
        // Switch to comments tab
        setActiveSidebarTab('comments');
        
        // Wait for tab switch and DOM update then scroll
        setTimeout(() => {
            console.log('Looking for comment element:', `comment-thread-${lineNumber}`);
            const commentElement = document.querySelector(`[data-testid="comment-thread-${lineNumber}"]`);
            if (commentElement) {
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight effect
                commentElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
                setTimeout(() => {
                    commentElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
                }, 2000);
            } else {
                console.log('Comment element not found');
            }
        }, 200); // Increased timeout to ensure tab switch completes
    };

    const handleScrollToRelation = (relationId: string) => {
        console.log('Switching to links tab for relation:', relationId);
        // Switch to links tab
        setActiveSidebarTab('links');
        
        // Wait for tab switch and DOM update then scroll
        setTimeout(() => {
            console.log('Looking for relation element:', `relation-${relationId}`);
            const relationElement = document.querySelector(`[data-testid="relation-${relationId}"]`);
            if (relationElement) {
                relationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight effect
                relationElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
                setTimeout(() => {
                    relationElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
                }, 2000);
            } else {
                console.log('Relation element not found');
            }
        }, 200); // Increased timeout to ensure tab switch completes
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
                                comments: lc.comments
                            }))}
                            relationCounts={Object.fromEntries(relationCountsByLine.entries()) as any}
                            relations={relations}
                            onLineSelect={handleLineSelect}
                            onAddComment={handleAddComment}
                            onHighlightToggle={handleHighlightToggle}
                            onCreateRelation={(lines) => {
                                setPendingRelationLines(lines);
                                // Switch to links tab when creating a new relation
                                setActiveSidebarTab('links');
                            }}
                            onScrollToComment={handleScrollToComment}
                            onScrollToRelation={handleScrollToRelation}
                        />
                    )}

                    <CommentSidebar
                        lineComments={lineComments}
                        relations={relations}
                        currentUsername={me?.username ?? null}
                        onAddComment={(lineNumber, content) => {
                            if (activeDocument) {
                                addCommentMutation.mutate({
                                    documentId: activeDocument,
                                    lineNumber,
                                    content,
                                });
                            }
                        }}
                        onAddReply={handleAddReply}
                        onEditComment={(commentId, content) => updateCommentMutation.mutateAsync({ id: commentId, content })}
                        onDeleteComment={(commentId) => deleteCommentMutation.mutateAsync(commentId)}
                        pendingCommentLine={pendingCommentLine}
                        onCancelPendingComment={handleCancelPendingComment}
                        pendingRelationLines={pendingRelationLines}
                        onCancelPendingRelation={handleCancelPendingRelation}
                        onCreateRelation={(url, note, spans) => {
                            if (!activeDocument) return;
                            createRelationMutation.mutate({
                                documentId: activeDocument,
                                url,
                                note,
                                spans,
                            });
                        }}
                        onDeleteRelation={(relationId) => deleteRelationMutation.mutate(relationId)}
                        toSpans={toSpans}
                        activeTab={activeSidebarTab}
                        onTabChange={setActiveSidebarTab}
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
