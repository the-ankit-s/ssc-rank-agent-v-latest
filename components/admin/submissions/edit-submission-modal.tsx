"use client";

import { useState } from "react";

interface EditSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: EditSubmissionData) => Promise<void>;
    submission: {
        id: number;
        category: string;
        gender: string;
        state: string | null;
        adminNotes: string | null;
    };
}

export interface EditSubmissionData {
    category: string;
    gender: string;
    state: string;
    adminNotes: string;
    manualScoreOverride?: number;
    overrideReason?: string;
}

export function EditSubmissionModal({
    isOpen,
    onClose,
    onSave,
    submission,
}: EditSubmissionModalProps) {
    const [formData, setFormData] = useState<EditSubmissionData>({
        category: submission.category,
        gender: submission.gender,
        state: submission.state || "",
        adminNotes: submission.adminNotes || "",
        manualScoreOverride: undefined,
        overrideReason: "",
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Error saving:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-white rounded-xl border-2 border-black shadow-brutal max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b-2 border-black flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 uppercase">
                        Edit Submission
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Category and Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) =>
                                    setFormData({ ...formData, category: e.target.value })
                                }
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            >
                                <option value="UR">UR</option>
                                <option value="OBC">OBC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="EWS">EWS</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Gender
                            </label>
                            <select
                                value={formData.gender}
                                onChange={(e) =>
                                    setFormData({ ...formData, gender: e.target.value })
                                }
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* State */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            State
                        </label>
                        <input
                            type="text"
                            value={formData.state}
                            onChange={(e) =>
                                setFormData({ ...formData, state: e.target.value })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            placeholder="Enter state"
                        />
                    </div>

                    {/* Manual Score Override */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Manual Score Override (Optional)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.manualScoreOverride || ""}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    manualScoreOverride: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            placeholder="Enter score"
                        />
                    </div>

                    {/* Override Reason */}
                    {formData.manualScoreOverride !== undefined && 
                     formData.manualScoreOverride !== null && 
                     formData.manualScoreOverride !== 0 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Override Reason
                            </label>
                            <input
                                type="text"
                                value={formData.overrideReason}
                                onChange={(e) =>
                                    setFormData({ ...formData, overrideReason: e.target.value })
                                }
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                                placeholder="Why is the score being overridden?"
                                required
                            />
                        </div>
                    )}

                    {/* Admin Notes */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Admin Notes
                        </label>
                        <textarea
                            value={formData.adminNotes}
                            onChange={(e) =>
                                setFormData({ ...formData, adminNotes: e.target.value })
                            }
                            rows={4}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors resize-none"
                            placeholder="Add any notes about this submission..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
