import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertCommentSchema, insertHighlightSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
    app.get("/api/documents", async (_req, res) => {
        try {
            const documents = await storage.getAllDocuments();
            res.json(documents);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch documents" });
        }
    });

    app.get("/api/documents/:id", async (req, res) => {
        try {
            const document = await storage.getDocument(req.params.id);
            if (!document) {
                return res.status(404).json({ error: "Document not found" });
            }
            res.json(document);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch document" });
        }
    });

    app.post("/api/documents", async (req, res) => {
        try {
            const validatedData = insertDocumentSchema.parse(req.body);
            const document = await storage.createDocument(validatedData);
            res.status(201).json(document);
        } catch (error) {
            res.status(400).json({ error: "Invalid document data" });
        }
    });

    // Import document from external URL (txt only)
    app.post("/api/documents/import-url", async (req, res) => {
        try {
            const url: string | undefined = req.body?.url;
            if (!url || typeof url !== "string") {
                return res.status(400).json({ error: "Missing 'url' in request body" });
            }
            let parsed: URL;
            try {
                parsed = new URL(url);
            } catch {
                return res.status(400).json({ error: "Invalid URL" });
            }
            if (!/^https?:$/.test(parsed.protocol)) {
                return res.status(400).json({ error: "Only http/https URLs are allowed" });
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            let fetched;
            try {
                fetched = await fetch(url, {
                    method: "GET",
                    headers: { Accept: "text/plain, text/*;q=0.9, */*;q=0.1" },
                    signal: controller.signal,
                });
            } catch (e) {
                clearTimeout(timeout);
                return res.status(502).json({ error: "Failed to fetch URL" });
            }
            clearTimeout(timeout);

            if (!fetched.ok) {
                return res.status(502).json({ error: `Upstream responded ${fetched.status}` });
            }

            const contentType = (fetched.headers.get("content-type") || "").toLowerCase();
            const isTextByHeader = contentType.startsWith("text/") || contentType.includes("text/plain");
            const isTxtByExt = parsed.pathname.toLowerCase().endsWith(".txt");
            if (!isTextByHeader && !isTxtByExt) {
                return res.status(415).json({ error: "Only TXT/text content can be imported" });
            }

            const contentLengthHeader = fetched.headers.get("content-length");
            const maxBytes = 10 * 1024 * 1024; // 10 MB
            if (contentLengthHeader) {
                const size = parseInt(contentLengthHeader, 10);
                if (!Number.isNaN(size) && size > maxBytes) {
                    return res.status(413).json({ error: "File too large (max 10MB)" });
                }
            }

            const text = await fetched.text();
            if (new TextEncoder().encode(text).length > maxBytes) {
                return res.status(413).json({ error: "File too large (max 10MB)" });
            }

            const last = parsed.pathname.split("/").filter(Boolean).pop();
            const name = last ? decodeURIComponent(last) : "imported.txt";

            const document = await storage.createDocument({
                name,
                content: text,
                type: "txt",
            });

            res.status(201).json(document);
        } catch (error) {
            res.status(500).json({ error: "Failed to import document from URL" });
        }
    });

    app.delete("/api/documents/:id", async (req, res) => {
        try {
            await storage.deleteDocument(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete document" });
        }
    });

    app.get("/api/documents/:documentId/comments", async (req, res) => {
        try {
            const comments = await storage.getCommentsByDocument(req.params.documentId);
            res.json(comments);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch comments" });
        }
    });

    app.post("/api/comments", async (req, res) => {
        try {
            const validatedData = insertCommentSchema.parse(req.body);
            const comment = await storage.createComment(validatedData);
            res.status(201).json(comment);
        } catch (error) {
            res.status(400).json({ error: "Invalid comment data" });
        }
    });

    app.delete("/api/comments/:id", async (req, res) => {
        try {
            await storage.deleteComment(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete comment" });
        }
    });

    app.get("/api/documents/:documentId/highlights", async (req, res) => {
        try {
            const highlights = await storage.getHighlightsByDocument(req.params.documentId);
            res.json(highlights);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch highlights" });
        }
    });

    app.post("/api/highlights/toggle", async (req, res) => {
        try {
            const validatedData = insertHighlightSchema.parse(req.body);
            const result = await storage.toggleHighlight(
                validatedData.documentId,
                validatedData.lineNumber
            );
            res.json({ highlight: result, action: result ? "created" : "deleted" });
        } catch (error) {
            res.status(400).json({ error: "Invalid highlight data" });
        }
    });

    const httpServer = createServer(app);

    return httpServer;
}
