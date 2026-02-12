"use client";

type DeleteConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
};

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border-2 border-black shadow-brutal max-w-md w-full">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center border-2 border-black">
              <span className="material-symbols-outlined text-red-600">
                warning
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black">{title}</h2>
              <p className="text-gray-600">{message}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 font-bold border-2 border-black rounded-lg hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-red-600 text-white font-bold border-2 border-black rounded-lg hover:bg-red-700 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
