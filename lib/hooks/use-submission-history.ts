"use client";

import { useState, useEffect } from "react";

export interface StoredSubmission {
    examSlug: string;
    submissionId: string;
    timestamp: number;
}

const STORAGE_KEY = "rankmitra_submissions";

export function useSubmissionHistory() {
    const [history, setHistory] = useState<StoredSubmission[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load from local storage on mount
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load submission history", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const saveSubmission = (examSlug: string, submissionId: string) => {
        try {
            const newEntry: StoredSubmission = {
                examSlug,
                submissionId,
                timestamp: Date.now(),
            };

            // Remove existing entry for this exam if any (update it)
            const currentHistory = history.filter((h) => h.examSlug !== examSlug);
            const updatedHistory = [newEntry, ...currentHistory];

            setHistory(updatedHistory);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (e) {
            console.error("Failed to save submission history", e);
        }
    };

    const getSubmission = (examSlug: string) => {
        return history.find((h) => h.examSlug === examSlug);
    };

    return {
        history,
        saveSubmission,
        getSubmission,
        isLoaded,
    };
}
