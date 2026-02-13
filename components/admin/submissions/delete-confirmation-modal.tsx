"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/admin/ui";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDeleting?: boolean;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", isDeleting = false }: DeleteConfirmationModalProps) {
    return (
        <Dialog open={isOpen} onClose={onClose}>
            <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900 text-center">{title}</h3>
                <p className="text-sm text-gray-500 text-center mt-2">{message}</p>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} disabled={isDeleting}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={isDeleting}
                        className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : confirmText}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
