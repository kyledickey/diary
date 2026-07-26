import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DocumentPreferences {
    selectedDocumentId: string | null;
    selectDocument(id: string | null): void;
}

export const useDocumentPreferences = create<DocumentPreferences>()(
    persist(
        (set) => ({
            selectedDocumentId: null,
            selectDocument: (selectedDocumentId) => set({ selectedDocumentId })
        }),
        {
            name: "document-preferences"
        }
    )
);
