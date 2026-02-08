import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createRelationWithSpansSchema, insertDocumentSchema, insertCommentSchema, insertHighlightSchema, registerSchema, users } from "@shared/schema";
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
            req.login({ id: user.id, username: user.username, email: user.email ?? null }, (err: any) => {
                if (err) return res.status(201).json({ id: user.id, username: user.username, email: user.email ?? null });
                res.status(201).json({ id: user.id, username: user.username, email: user.email ?? null });
            });
        } catch (error) {
            res.status(400).json({ error: "Invalid register data" });
        }
    });

    app.post("/api/auth/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
            req.login(user, (err: any) => {
                if (err) return next(err);
                res.json(user);
            });
        })(req, res, next);
    });

    app.post("/api/auth/logout", (req, res, next) => {
        req.logout((err: any) => {
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
    app.post("/api/documents", requireAuth, async (req, res) => {
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
            res.json({ success: true });
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
            const validatedData = insertCommentSchema.omit({ author: true }).parse(req.body);
            const user = req.user as any;
            const author = user?.username;
            if (!author) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const comment = await storage.createComment({
                ...validatedData,
                author,
            } as any);
            res.status(201).json(comment);
        } catch (error) {
            res.status(400).json({ error: "Invalid comment data" });
        }
    });

    app.put("/api/comments/:id", requireAuth, async (req, res) => {
        try {
            const user = req.user as any;
            const username = user?.username;
            if (!username) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const content = req.body?.content;
            if (typeof content !== "string" || !content.trim()) {
                return res.status(400).json({ error: "Invalid content" });
            }

            const existing = await storage.getCommentById(req.params.id);
            if (!existing) {
                return res.status(404).json({ error: "Comment not found" });
            }
            if (existing.author !== username) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const updated = await storage.updateCommentContent(req.params.id, content.trim());
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: "Failed to update comment" });
        }
    });

    app.delete("/api/comments/:id", requireAuth, async (req, res) => {
        try {
            const user = req.user as any;
            const username = user?.username;
            if (!username) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const existing = await storage.getCommentById(req.params.id);
            if (!existing) {
                return res.status(404).json({ error: "Comment not found" });
            }
            if (existing.author !== username) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const hasChildren = await storage.hasChildComments(req.params.id);
            if (hasChildren) {
                return res.status(409).json({
                    error: "Conflict",
                    message: "Нельзя удалить комментарий, если у него есть ответы",
                });
            }

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

    // Relations (links) - публичное чтение
    app.get("/api/documents/:documentId/relations", async (req, res) => {
        try {
            const rels = await storage.getRelationsByDocument(req.params.documentId);
            const spans = await storage.getRelationSpansByRelations(rels.map(r => r.id));
            const byRelation: Record<string, any[]> = {};
            for (const s of spans) {
                if (!byRelation[s.relationId]) byRelation[s.relationId] = [];
                byRelation[s.relationId].push(s);
            }
            res.json(rels.map(r => ({
                ...r,
                spans: byRelation[r.id] ?? [],
            })));
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch relations" });
        }
    });

    // Create relation with spans - требует авторизации
    app.post("/api/relations", requireAuth, async (req, res) => {
        try {
            const data = createRelationWithSpansSchema.parse(req.body);
            const relation = await storage.createRelation({
                documentId: data.documentId,
                url: data.url,
                note: data.note ?? null,
            } as any);
            const createdSpans = [];
            for (const span of data.spans) {
                createdSpans.push(await storage.createRelationSpan({
                    relationId: relation.id,
                    startLine: span.startLine,
                    endLine: span.endLine,
                } as any));
            }
            res.status(201).json({ ...relation, spans: createdSpans });
        } catch (error) {
            res.status(400).json({ error: "Invalid relation data" });
        }
    });

    // Add span to existing relation - требует авторизации
    app.post("/api/relations/:relationId/spans", requireAuth, async (req, res) => {
        try {
            const startLine = Number(req.body?.startLine);
            const endLine = Number(req.body?.endLine);
            if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine <= 0 || endLine <= 0 || startLine > endLine) {
                return res.status(400).json({ error: "Invalid span" });
            }
            const span = await storage.createRelationSpan({
                relationId: req.params.relationId,
                startLine,
                endLine,
            } as any);
            res.status(201).json(span);
        } catch (error) {
            res.status(500).json({ error: "Failed to create span" });
        }
    });

    // Delete relation - требует авторизации
    app.delete("/api/relations/:relationId", requireAuth, async (req, res) => {
        try {
            await storage.deleteRelation(req.params.relationId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete relation" });
        }
    });

    // Delete relation span - требует авторизации
    app.delete("/api/relation-spans/:spanId", requireAuth, async (req, res) => {
        try {
            await storage.deleteRelationSpan(req.params.spanId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete relation span" });
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
