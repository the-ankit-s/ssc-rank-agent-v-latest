"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const tabs = [
    { id: "general", label: "General", icon: "tune" },
    { id: "security", label: "Security", icon: "shield" },
    { id: "notifications", label: "Notifications", icon: "notifications" },
    { id: "billing", label: "Billing", icon: "credit_card" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("general");
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/admin/settings")
            .then((res) => res.json())
            .then((data) => {
                setSettings(data.settings || {});
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
            });
            if (res.ok) {
                alert("Settings saved successfully!");
            } else {
                alert("Failed to save settings.");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-black text-6xl animate-spin">rotate_right</span>
        </div>
    );

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
                <p className="text-gray-500 font-medium mt-1">Manage system preferences.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white border-2 border-gray-900 shadow-neo rounded-xl overflow-hidden p-2 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 transition-all font-bold text-sm text-left rounded-lg",
                                    activeTab === tab.id
                                        ? "bg-[#A78BFA] text-gray-900 border-2 border-gray-900 shadow-sm"
                                        : "bg-white text-gray-500 hover:bg-[#F3E8FF] hover:text-gray-900"
                                )}
                            >
                                <span className={cn("material-symbols-outlined text-[20px]", activeTab === tab.id ? "text-gray-900" : "text-gray-400")}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white border-2 border-gray-900 shadow-neo rounded-xl p-8">
                    {/* General Tab */}
                    {activeTab === "general" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-6">General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Organization Name</label>
                                        <input
                                            type="text"
                                            value={settings.orgName || "RankMitra"}
                                            onChange={(e) => handleChange("orgName", e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 font-bold focus:outline-none focus:border-[#A78BFA] focus:bg-white focus:shadow-sm transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Support Email</label>
                                        <input
                                            type="email"
                                            value={settings.supportEmail || "support@rankmitra.com"}
                                            onChange={(e) => handleChange("supportEmail", e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 font-bold focus:outline-none focus:border-[#A78BFA] focus:bg-white focus:shadow-sm transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-6">System Preferences</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                                        <div>
                                            <p className="font-bold text-gray-900">Maintenance Mode</p>
                                            <p className="text-xs text-gray-500 font-medium mt-1">Disable access for all non-admin users</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.maintenanceMode || false}
                                                onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A78BFA]"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                                        <div>
                                            <p className="font-bold text-gray-900">Debug Logging</p>
                                            <p className="text-xs text-gray-500 font-medium mt-1">Enable verbose system logs (Not recommended)</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.debugLogging || false}
                                                onChange={(e) => handleChange("debugLogging", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A78BFA]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-3 bg-[#A78BFA] text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-neo hover:shadow-neo-hover hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    )}
                    {activeTab !== "general" && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-gray-300">construction</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Coming Soon</h3>
                            <p className="text-gray-500 font-medium max-w-md mt-2">
                                This section is currently under development. Check back later for updates.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
