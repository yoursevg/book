import {
    type Document,
    type InsertDocument,
    type Comment,
    type InsertComment,
    type Highlight,
    type InsertHighlight,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { documents, comments, highlights } from "@shared/schema";
import { eq, and, asc, desc } from "drizzle-orm";

export interface IStorage {
    createDocument(document: InsertDocument): Promise<Document>;
    getDocument(id: string): Promise<Document | undefined>;
    getAllDocuments(): Promise<Document[]>;
    deleteDocument(id: string): Promise<void>;

    createComment(comment: InsertComment): Promise<Comment>;
    getCommentsByDocument(documentId: string): Promise<Comment[]>;
    deleteComment(id: string): Promise<void>;

    createHighlight(highlight: InsertHighlight): Promise<Highlight>;
    getHighlightsByDocument(documentId: string): Promise<Highlight[]>;
    deleteHighlight(documentId: string, lineNumber: number): Promise<void>;
    toggleHighlight(documentId: string, lineNumber: number): Promise<Highlight | null>;
}

export class MemStorage implements IStorage {
    private documents: Map<string, Document>;
    private comments: Map<string, Comment>;
    private highlights: Map<string, Highlight>;

    constructor() {
        this.documents = new Map();
        this.comments = new Map();
        this.highlights = new Map();
    }

    async createDocument(insertDocument: InsertDocument): Promise<Document> {
        const id = randomUUID();
        const document: Document = {
            ...insertDocument,
            id,
            uploadedAt: new Date(),
        };
        this.documents.set(id, document);
        return document;
    }

    async getDocument(id: string): Promise<Document | undefined> {
        return this.documents.get(id);
    }

    async getAllDocuments(): Promise<Document[]> {
        return Array.from(this.documents.values()).sort(
            (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
        );
    }

    async deleteDocument(id: string): Promise<void> {
        this.documents.delete(id);
        Array.from(this.comments.values())
            .filter((c) => c.documentId === id)
            .forEach((c) => this.comments.delete(c.id));
        Array.from(this.highlights.values())
            .filter((h) => h.documentId === id)
            .forEach((h) => this.highlights.delete(h.id));
    }

    async createComment(insertComment: InsertComment): Promise<Comment> {
        const id = randomUUID();
        const comment: Comment = {
            ...insertComment,
            parentCommentId: insertComment.parentCommentId || null,
            id,
            createdAt: new Date(),
        };
        this.comments.set(id, comment);
        return comment;
    }

    async getCommentsByDocument(documentId: string): Promise<Comment[]> {
        return Array.from(this.comments.values())
            .filter((c) => c.documentId === documentId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    async deleteComment(id: string): Promise<void> {
        this.comments.delete(id);
        Array.from(this.comments.values())
            .filter((c) => c.parentCommentId === id)
            .forEach((c) => this.comments.delete(c.id));
    }

    async createHighlight(insertHighlight: InsertHighlight): Promise<Highlight> {
        const id = randomUUID();
        const highlight: Highlight = {
            ...insertHighlight,
            id,
        };
        this.highlights.set(id, highlight);
        return highlight;
    }

    async getHighlightsByDocument(documentId: string): Promise<Highlight[]> {
        return Array.from(this.highlights.values()).filter(
            (h) => h.documentId === documentId
        );
    }

    async deleteHighlight(documentId: string, lineNumber: number): Promise<void> {
        const highlight = Array.from(this.highlights.values()).find(
            (h) => h.documentId === documentId && h.lineNumber === lineNumber
        );
        if (highlight) {
            this.highlights.delete(highlight.id);
        }
    }

    async toggleHighlight(documentId: string, lineNumber: number): Promise<Highlight | null> {
        const existing = Array.from(this.highlights.values()).find(
            (h) => h.documentId === documentId && h.lineNumber === lineNumber
        );

        if (existing) {
            this.highlights.delete(existing.id);
            return null;
        } else {
            return this.createHighlight({ documentId, lineNumber });
        }
    }
}

class DbStorage implements IStorage {
    async createDocument(insertDocument: InsertDocument): Promise<Document> {
        const [row] = await db.insert(documents).values(insertDocument as any).returning();
        return row as Document;
    }

    async getDocument(id: string): Promise<Document | undefined> {
        const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
        return row as Document | undefined;
    }

    async getAllDocuments(): Promise<Document[]> {
        const rows = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
        return rows as Document[];
    }

    async deleteDocument(id: string): Promise<void> {
        await db.delete(documents).where(eq(documents.id, id));
    }

    async createComment(insertComment: InsertComment): Promise<Comment> {
        const [row] = await db.insert(comments).values({
            ...insertComment,
            parentCommentId: insertComment.parentCommentId ?? null,
        } as any).returning();
        return row as Comment;
    }

    async getCommentsByDocument(documentId: string): Promise<Comment[]> {
        const rows = await db.select().from(comments)
            .where(eq(comments.documentId, documentId))
            .orderBy(asc(comments.createdAt));
        return rows as Comment[];
    }

    async deleteComment(id: string): Promise<void> {
        // delete the comment and its direct replies
        await db.delete(comments).where(eq(comments.id, id));
        await db.delete(comments).where(eq(comments.parentCommentId, id));
    }

    async createHighlight(insertHighlight: InsertHighlight): Promise<Highlight> {
        const [row] = await db.insert(highlights).values(insertHighlight as any).returning();
        return row as Highlight;
    }

    async getHighlightsByDocument(documentId: string): Promise<Highlight[]> {
        const rows = await db.select().from(highlights).where(eq(highlights.documentId, documentId));
        return rows as Highlight[];
    }

    async deleteHighlight(documentId: string, lineNumber: number): Promise<void> {
        await db.delete(highlights).where(and(eq(highlights.documentId, documentId), eq(highlights.lineNumber, lineNumber)));
    }

    async toggleHighlight(documentId: string, lineNumber: number): Promise<Highlight | null> {
        const [existing] = await db.select().from(highlights)
            .where(and(eq(highlights.documentId, documentId), eq(highlights.lineNumber, lineNumber)))
            .limit(1);
        if (existing) {
            await this.deleteHighlight(documentId, lineNumber);
            return null;
        }
        return this.createHighlight({ documentId, lineNumber });
    }
}

const useDb = !!db;
export const storage: IStorage = useDb ? new DbStorage() : new MemStorage();
