import {
    type Document,
    type InsertDocument,
    type Comment,
    type InsertComment,
    type Highlight,
    type InsertHighlight,
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export const storage = new MemStorage();
