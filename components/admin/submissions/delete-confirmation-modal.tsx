"use client";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDeleting?: boolean;
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Delete",
    isDeleting = false,
}: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl border-2 border-black shadow-brutal max-w-md w-full animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b-2 border-black">
                    <h3 className="text-xl font-black text-gray-900 uppercase">{title}</h3>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-700 font-medium">{message}</p>
                </div>

                {/* Footer */}
                <div className="p-6 border-t-2 border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                    >
                        {isDeleting ? "Deleting..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
