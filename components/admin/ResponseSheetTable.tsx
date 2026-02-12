"use client";

import { useState } from "react";

type Response = {
  qNo: number;
  section: string;
  selected: string | null;
  correct: string;
  isCorrect: boolean;
};

type ResponseSheetTableProps = {
  responses: Response[];
  sections: string[];
};

export default function ResponseSheetTable({
  responses,
  sections,
}: ResponseSheetTableProps) {
  const [selectedSection, setSelectedSection] = useState<string>("ALL");

  const filteredResponses =
    selectedSection === "ALL"
      ? responses
      : responses.filter((r) => r.section === selectedSection);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSection("ALL")}
          className={`px-4 py-2 font-bold border-2 border-black rounded-lg transition-all ${
            selectedSection === "ALL"
              ? "bg-black text-white"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          All Sections
        </button>
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setSelectedSection(section)}
            className={`px-4 py-2 font-bold border-2 border-black rounded-lg transition-all ${
              selectedSection === section
                ? "bg-black text-white"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2">
        {filteredResponses.map((response) => (
          <div
            key={response.qNo}
            className={`relative aspect-square flex flex-col items-center justify-center border-2 border-black rounded-lg font-bold text-sm ${
              response.selected === null
                ? "bg-gray-100 text-gray-400"
                : response.isCorrect
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
            }`}
            title={`Q${response.qNo} | Section: ${response.section} | Selected: ${response.selected || "N/A"} | Correct: ${response.correct}`}
          >
            <span className="text-xs">{response.qNo}</span>
            <span className="text-lg font-black">
              {response.selected || "-"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-black rounded" />
          <span>Correct</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border-2 border-black rounded" />
          <span>Wrong</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border-2 border-black rounded" />
          <span>Not Attempted</span>
        </div>
      </div>
    </div>
  );
}
