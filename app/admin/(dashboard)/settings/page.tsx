"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSettings, Settings } from "@/hooks/admin/use-admin";
import { toast } from "sonner";

// ─── Setting definitions ─────────────────────────────────────────────────────
interface SettingDef {
    key: string;
    label: string;
    description: string;
    type: "text" | "email" | "toggle" | "number" | "select";
    options?: { value: string; label: string }[];
    placeholder?: string;
    step?: number;
}

const generalSettings: SettingDef[] = [
    { key: "orgName", label: "Organization Name", description: "Display name used across the platform", type: "text", placeholder: "RankPredict" },
    { key: "supportEmail", label: "Support Email", description: "Contact email shown to users", type: "email", placeholder: "support@rankpredict.com" },
    { key: "maintenanceMode", label: "Maintenance Mode", description: "Disable access for all non-admin users. A maintenance page will be shown instead.", type: "toggle" },
    { key: "debugLogging", label: "Debug Logging", description: "Enable verbose system logs. Use only for debugging — impacts performance.", type: "toggle" },
];

const examDefaults: SettingDef[] = [
    { key: "defaultPositive", label: "Default Positive Marks", description: "Default marks awarded for correct answers in new exams", type: "number", step: 0.5, placeholder: "2" },
    { key: "defaultNegative", label: "Default Negative Marks", description: "Default marks deducted for wrong answers in new exams", type: "number", step: 0.25, placeholder: "0.5" },
    { key: "allowMultipleSubmissions", label: "Allow Multiple Submissions", description: "Let students submit results for the same exam more than once", type: "toggle" },
    { key: "enableDuplicateDetection", label: "Duplicate Detection", description: "Automatically flag submissions with identical roll numbers", type: "toggle" },
    { key: "autoCalculateRanks", label: "Auto-Calculate Ranks", description: "Automatically compute ranks when new submissions are added", type: "toggle" },
];

const pipelineSettings: SettingDef[] = [
    { key: "maxRetries", label: "Max Parse Retries", description: "Number of retry attempts before marking a parse job as failed", type: "number", placeholder: "3" },
    { key: "requestTimeout", label: "Request Timeout (ms)", description: "Maximum time to wait for external API responses", type: "number", placeholder: "30000" },
    { key: "enableMockParser", label: "Mock Parser", description: "Use simulated parsing responses instead of real data. Useful for testing.", type: "toggle" },
    {
        key: "rankingMethod", label: "Ranking Method", description: "Algorithm used to compute candidate ranks", type: "select", options: [
            { value: "standard", label: "Standard (1-2-3)" },
            { value: "dense", label: "Dense (1-1-2)" },
            { value: "percentile", label: "Percentile-based" },
        ]
    },
    {
        key: "percentileMethod", label: "Percentile Method", description: "Formula used for percentile calculations", type: "select", options: [
            { value: "equipercentile", label: "Equipercentile" },
            { value: "linear", label: "Linear Interpolation" },
            { value: "ssc_official", label: "SSC Official Formula" },
        ]
    },
];

const tabs = [
    { id: "general", label: "General", icon: "tune", settings: generalSettings },
    { id: "exam", label: "Exam Defaults", icon: "quiz", settings: examDefaults },
    { id: "pipeline", label: "Data Pipeline", icon: "manufacturing", settings: pipelineSettings },
];

// ─── Components ──────────────────────────────────────────────────────────────

function SettingRow({ def, value, onChange }: { def: SettingDef; value: any; onChange: (v: any) => void }) {
    if (def.type === "toggle") {
        return (
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors group">
                <div className="pr-4">
                    <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{def.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                        type="checkbox"
                        checked={value || false}
                        onChange={(e) => onChange(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-10 h-[22px] bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:after:translate-x-[18px]" />
                </label>
            </div>
        );
    }

    if (def.type === "select") {
        return (
            <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors space-y-2">
                <div>
                    <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{def.description}</p>
                </div>
                <div className="relative">
                    <select
                        value={value || def.options?.[0]?.value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all appearance-none cursor-pointer"
                    >
                        {def.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors space-y-2">
            <div>
                <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{def.description}</p>
            </div>
            <input
                type={def.type === "number" ? "number" : def.type}
                value={value ?? ""}
                onChange={(e) => onChange(def.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                step={def.step}
                placeholder={def.placeholder}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all placeholder:text-gray-400"
            />
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("general");
    const [settings, setSettings] = useState<Settings>({});

    const { data, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();

    useEffect(() => {
        if (data) setSettings(data);
    }, [data]);

    const hasChanges = useMemo(() => {
        if (!data) return false;
        return JSON.stringify(data) !== JSON.stringify(settings);
    }, [data, settings]);

    const handleSave = () => {
        const promise = updateSettings.mutateAsync(settings);
        toast.promise(promise, {
            loading: "Saving settings...",
            success: "Settings saved!",
            error: "Failed to save settings.",
        });
    };

    const handleReset = () => {
        if (data) setSettings({ ...data });
    };

    const handleChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="h-8 bg-gray-200 rounded-lg w-40 animate-pulse" />
            <div className="flex gap-6">
                <div className="w-56 space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
                <div className="flex-1 space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            </div>
        </div>
    );

    const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Configure system behavior and defaults</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button onClick={handleReset} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all font-medium">
                            Discard
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={updateSettings.isPending || !hasChanges}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                            hasChanges
                                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        {updateSettings.isPending && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        {updateSettings.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Tab Navigation */}
                <div className="w-full md:w-52 shrink-0">
                    <div className="bg-white border border-gray-200 rounded-xl p-1.5 space-y-0.5 sticky top-20">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all text-left relative",
                                    activeTab === tab.id
                                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <span className={cn("material-symbols-outlined text-lg", activeTab === tab.id ? "text-indigo-600" : "text-gray-400")}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                                {/* Unsaved changes dot */}
                                {hasChanges && tab.settings.some(s => {
                                    const orig = data?.[s.key];
                                    const curr = settings[s.key];
                                    return JSON.stringify(orig) !== JSON.stringify(curr);
                                }) && (
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                    )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200" key={activeTab}>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-xl text-gray-400">{currentTab.icon}</span>
                        <h2 className="text-lg font-bold text-gray-900">{currentTab.label}</h2>
                    </div>
                    {currentTab.settings.map(def => (
                        <SettingRow
                            key={def.key}
                            def={def}
                            value={settings[def.key]}
                            onChange={(v) => handleChange(def.key, v)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
