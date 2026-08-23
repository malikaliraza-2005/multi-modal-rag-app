"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type DocumentRecord } from "@/lib/api";

export const documentsKey = ["documents"] as const;

export function useDocuments() {
  return useQuery({ queryKey: documentsKey, queryFn: api.listDocuments });
}

export function useDocument(docId: string) {
  return useQuery({
    queryKey: [...documentsKey, docId],
    queryFn: () => api.getDocument(docId),
  });
}

export function useUploadDocument(onIndexed?: (doc: DocumentRecord) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentsKey });
      onIndexed?.(doc);
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.deleteDocument(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentsKey }),
  });
}
