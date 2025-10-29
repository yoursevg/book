import { useState } from "react";
import { Upload, File, FileText, Link, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentUploadProps {
    onFileUpload?: (file: File) => void;
    onUrlImport?: (url: string) => void;
}

export default function DocumentUpload({ onFileUpload, onUrlImport }: DocumentUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [importUrl, setImportUrl] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
                setUploadedFiles(prev => [...prev, file]);
                onFileUpload?.(file);
                console.log("File dropped:", file.name);
            }
        });
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            setUploadedFiles(prev => [...prev, file]);
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

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
        console.log("File removed");
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

                        {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-medium">Uploaded Files:</h4>
                                {uploadedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 border rounded-lg"
                                        data-testid={`uploaded-file-${index}`}
                                    >
                                        {file.type === "application/pdf" ? (
                                            <File className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-blue-500" />
                                        )}
                                        <span className="flex-1 text-sm">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(index)}
                                            className="w-6 h-6"
                                            data-testid={`button-remove-file-${index}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
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