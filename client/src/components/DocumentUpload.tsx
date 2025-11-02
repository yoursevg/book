import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Upload, Link } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DocumentUploadProps {
    onFileUpload?: (file: File) => void;
    onUrlImport?: (url: string) => void;
}

export default function DocumentUpload({ onFileUpload, onUrlImport }: DocumentUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [importUrl, setImportUrl] = useState("");

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (file.type === "application/pdf" || file.type === "text/plain") {
                onFileUpload?.(file);
                console.log("File dropped:", file.name);
            }
        });
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            onFileUpload?.(file);
            console.log("File selected:", file.name);
        });
    };

    const handleUrlImport = () => {
        if (importUrl.trim()) {
            onUrlImport?.(importUrl);
            console.log("Importing from URL:", importUrl);
            setImportUrl("");
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="p-6">
                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload Files</TabsTrigger>
                        <TabsTrigger value="import">Import from URL</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                dragActive ? "border-primary bg-primary/5" : "border-border"
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            data-testid="upload-drop-zone"
                        >
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">Upload Documents</h3>
                            <p className="text-muted-foreground mb-4">
                                Drag and drop PDF or TXT files here, or click to select
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => document.getElementById("file-input")?.click()}
                                data-testid="button-select-files"
                            >
                                Select Files
                            </Button>
                            <input
                                id="file-input"
                                type="file"
                                multiple
                                accept=".pdf,.txt"
                                onChange={handleFileInput}
                                className="hidden"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Supports PDF and TXT files up to 10MB
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4">
                        <div className="text-center py-4">
                            <Link className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">Import from URL</h3>
                            <p className="text-muted-foreground mb-4">
                                Import TXT documents from public web URLs
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Input
                                type="url"
                                placeholder="https://example.com/document.txt"
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                data-testid="input-import-url"
                            />
                            <Button
                                onClick={handleUrlImport}
                                disabled={!importUrl.trim()}
                                className="w-full"
                                data-testid="button-import-url"
                            >
                                Import Document
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>• Supports public URLs for TXT files</p>
                            <p>• Must be publicly accessible (no authentication required)</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}