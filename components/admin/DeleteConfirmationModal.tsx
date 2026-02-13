"use client";

import { Dialog } from "@/components/admin/ui";
import { AlertTriangle } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
};

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message }: Props) {
  const handleConfirm = async () => { await onConfirm(); onClose(); };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-black text-gray-900 text-center">{title}</h3>
        <p className="text-sm text-gray-500 text-center mt-2">{message}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </div>
    </Dialog>
  );
}
