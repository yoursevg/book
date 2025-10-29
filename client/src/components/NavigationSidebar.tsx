import { FileText, Folder, Search, Upload, Settings } from "lucide-react";
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
import SearchBar from "./SearchBar";

interface Document {
    id: string;
    name: string;
    type: "pdf" | "txt" | "url";
    lastModified: string;
}

interface NavigationSidebarProps {
    documents?: Document[];
    activeDocument?: string;
    onDocumentSelect?: (documentId: string) => void;
    onUploadClick?: () => void;
    onSearch?: (query: string) => void;
}

export default function NavigationSidebar({
                                              documents = [],
                                              activeDocument,
                                              onDocumentSelect,
                                              onUploadClick,
                                              onSearch
                                          }: NavigationSidebarProps) {
    const getDocumentIcon = (type: string) => {
        switch (type) {
            case "pdf":
                return <FileText className="w-4 h-4 text-red-500" />;
            case "txt":
                return <FileText className="w-4 h-4 text-blue-500" />;
            case "url":
                return <FileText className="w-4 h-4 text-green-500" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <Sidebar>
            <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
        <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">DocAnnotate</span>
        </div>
        <SearchBar
    onSearch={onSearch}
    placeholder="Search documents..."
    />
    </SidebarHeader>

    <SidebarContent>
    <SidebarGroup>
        <SidebarGroupLabel>Actions</SidebarGroupLabel>
    <SidebarGroupContent>
    <SidebarMenu>
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={onUploadClick}
    data-testid="button-upload-document"
    >
    <Upload className="w-4 h-4" />
        <span>Upload Document</span>
    </SidebarMenuButton>
    </SidebarMenuItem>
    </SidebarMenu>
    </SidebarGroupContent>
    </SidebarGroup>

    <SidebarGroup>
    <SidebarGroupLabel>Recent Documents ({documents.length})</SidebarGroupLabel>
    <SidebarGroupContent>
    <SidebarMenu>
        {documents.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No documents yet
                </div>
) : (
        documents.map((doc) => (
            <SidebarMenuItem key={doc.id}>
            <SidebarMenuButton
                isActive={activeDocument === doc.id}
    onClick={() => onDocumentSelect?.(doc.id)}
    data-testid={`button-document-${doc.id}`}
>
    {getDocumentIcon(doc.type)}
    <div className="flex-1 min-w-0">
    <div className="truncate">{doc.name}</div>
        <div className="text-xs text-muted-foreground">
        {doc.lastModified}
        </div>
        </div>
        </SidebarMenuButton>
        </SidebarMenuItem>
))
)}
    </SidebarMenu>
    </SidebarGroupContent>
    </SidebarGroup>
    </SidebarContent>

    <SidebarFooter className="p-4">
    <Button variant="ghost" size="sm" className="w-full justify-start">
    <Settings className="w-4 h-4 mr-2" />
        Settings
        </Button>
        </SidebarFooter>
        </Sidebar>
);
}