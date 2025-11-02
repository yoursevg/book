import { apiRequest } from "@/lib/queryClient";

export async function deleteDocument(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/documents/${id}`);
}