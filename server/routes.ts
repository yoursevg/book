import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertCommentSchema, insertHighlightSchema, registerSchema, users } from "@shared/schema";
import { passport } from "./auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { requireAuth } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
    // Auth routes
    app.post("/api/auth/register", async (req, res) => {
        try {
            if (!db) return res.status(500).json({ error: "Database is not configured" });
            const data = registerSchema.parse(req.body);
            // Check duplicate username
            const existing = await db.select().from(users).where(eq(users.username, data.username)).limit(1);
            if (existing[0]) {
                return res.status(409).json({ error: "Username already taken" });
            }
            const { salt, hash } = await hashPassword(data.password);
            const [user] = await db.insert(users).values({
                username: data.username,
                email: data.email ?? null,
                passwordHash: hash,
                passwordSalt: salt,
            } as any).returning();
            // Auto-login after registration
            req.login({ id: user.id, username: user.username, email: user.email ?? null }, (err) => {
                if (err) return res.status(201).json({ id: user.id, username: user.username, email: user.email ?? null });
                res.status(201).json({ id: user.id, username: user.username, email: user.email ?? null });
            });
        } catch (error) {
            res.status(400).json({ error: "Invalid register data" });
        }
    });

    app.post("/api/auth/login", (req, res, next) => {
        passport.authenticate("local", (err, user, info) => {
            if (err) return next(err);
            if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
            req.login(user, (err) => {
                if (err) return next(err);
                res.json(user);
            });
        })(req, res, next);
    });

    app.post("/api/auth/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            req.session?.destroy(() => {
                res.status(204).send();
            });
        });
    });

    app.get("/api/auth/me", (req, res) => {
        if (req.isAuthenticated && req.isAuthenticated()) {
            return res.json(req.user);
        }
        res.status(401).json({ error: "Unauthorized" });
    });

    // Documents - публичные маршруты (только чтение)
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

    // Защищенные маршруты - требуют авторизации
    app.post("/api/documents",  , async (req, res) => {
        try {
            const validatedData = insertDocumentSchema.parse(req.body);
            const document = await storage.createDocument(validatedData);
            res.status(201).json(document);
        } catch (error) {
            res.status(400).json({ error: "Invalid document data" });
        }
    });

    app.post("/api/documents/import-url", requireAuth, async (req, res) => {
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

    app.delete("/api/documents/:id", requireAuth, async (req, res) => {
        try {
            await storage.deleteDocument(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete document" });
        }
    });

    // Чтение комментариев - публично
    app.get("/api/documents/:documentId/comments", async (req, res) => {
        try {
            const comments = await storage.getCommentsByDocument(req.params.documentId);
            res.json(comments);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch comments" });
        }
    });

    // Создание/удаление комментариев - требует авторизации
    app.post("/api/comments", requireAuth, async (req, res) => {
        try {
            const validatedData = insertCommentSchema.parse(req.body);
            const comment = await storage.createComment(validatedData);
            res.status(201).json(comment);
        } catch (error) {
            res.status(400).json({ error: "Invalid comment data" });
        }
    });

    app.delete("/api/comments/:id", requireAuth, async (req, res) => {
        try {
            await storage.deleteComment(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete comment" });
        }
    });

    // Чтение подсветок - публично
    app.get("/api/documents/:documentId/highlights", async (req, res) => {
        try {
            const highlights = await storage.getHighlightsByDocument(req.params.documentId);
            res.json(highlights);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch highlights" });
        }
    });

    // Изменение подсветок - требует авторизации
    app.post("/api/highlights/toggle", requireAuth, async (req, res) => {
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
