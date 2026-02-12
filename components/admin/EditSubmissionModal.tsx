"use client";

import { useState, useEffect } from "react";

type EditSubmissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
  onSave: (data: any) => Promise<void>;
};

export default function EditSubmissionModal({
  isOpen,
  onClose,
  submission,
  onSave,
}: EditSubmissionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    fatherName: "",
    category: "",
    gender: "",
    state: "",
    isPWD: false,
    isExServiceman: false,
    adminNotes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (submission) {
      setFormData({
        name: submission.name || "",
        fatherName: submission.fatherName || "",
        category: submission.category || "",
        gender: submission.gender || "",
        state: submission.state || "",
        isPWD: submission.isPWD || false,
        isExServiceman: submission.isExServiceman || false,
        adminNotes: submission.adminNotes || "",
      });
    }
  }, [submission]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border-2 border-black shadow-brutal max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-black p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Edit Submission</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black hover:bg-gray-100"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-black rounded-lg font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Father's Name</label>
              <input
                type="text"
                value={formData.fatherName}
                onChange={(e) =>
                  setFormData({ ...formData, fatherName: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-black rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-black rounded-lg font-medium"
                required
              >
                <option value="GEN">GEN</option>
                <option value="EWS">EWS</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-black rounded-lg font-medium"
                required
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-black rounded-lg font-medium"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPWD}
                onChange={(e) =>
                  setFormData({ ...formData, isPWD: e.target.checked })
                }
                className="w-5 h-5 border-2 border-black rounded"
              />
              <span className="font-bold">PWD</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isExServiceman}
                onChange={(e) =>
                  setFormData({ ...formData, isExServiceman: e.target.checked })
                }
                className="w-5 h-5 border-2 border-black rounded"
              />
              <span className="font-bold">Ex-Serviceman</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Admin Notes</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) =>
                setFormData({ ...formData, adminNotes: e.target.value })
              }
              className="w-full px-4 py-2 border-2 border-black rounded-lg font-medium min-h-[100px]"
              placeholder="Add any administrative notes..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 font-bold border-2 border-black rounded-lg hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black text-white font-bold border-2 border-black rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
