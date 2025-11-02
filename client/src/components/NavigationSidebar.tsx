import { useState } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FileText, Upload, Search, Settings, X } from "lucide-react";

interface Document {
    id: string;
    name: string;
    type: "pdf" | "txt" | "url";
    lastModified: string;
}

interface NavigationSidebarProps {
    documents: Document[];
    activeDocument?: string;
    onDocumentSelect: (id: string) => void;
    onUploadClick: () => void;
    onSearch: (query: string) => void;
    onOpenSettings: () => void;
    onDeleteDocument: (id: string) => void;
}

export default function NavigationSidebar({
                                              documents,
                                              activeDocument,
                                              onDocumentSelect,
                                              onUploadClick,
                                              onSearch,
                                              onOpenSettings,
                                              onDeleteDocument,
                                          }: NavigationSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        onSearch(query);
    };

    const handleDeleteClick = (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation();
        setDocumentToDelete(doc);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (documentToDelete) {
            onDeleteDocument(documentToDelete.id);
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
        }
    };

    const filteredDocuments = documents.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Sidebar>
                <SidebarHeader className="p-4">
                    <h2 className="text-lg font-semibold">Documents</h2>
                    <div className="relative mt-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="pl-8"
                            data-testid="input-search-documents"
                        />
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Recent Documents</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {filteredDocuments.map((doc) => (
                                    <SidebarMenuItem key={doc.id}>
                                        <SidebarMenuButton
                                            isActive={activeDocument === doc.id}
                                            onClick={() => onDocumentSelect(doc.id)}
                                            data-testid={`document-${doc.id}`}
                                            className="group relative"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate">{doc.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {doc.lastModified}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleDeleteClick(e, doc)}
                                                data-testid={`button-delete-${doc.id}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="p-4 space-y-2">
                    <Button
                        onClick={onUploadClick}
                        className="w-full"
                        data-testid="button-sidebar-upload"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onOpenSettings}
                        className="w-full"
                        data-testid="button-sidebar-settings"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                </SidebarFooter>
            </Sidebar>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить документ "{documentToDelete?.name}"?
                            Это действие нельзя отменить. Все комментарии и выделения также будут удалены.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}