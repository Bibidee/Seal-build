"use client";

import { FileText, CheckSquare, Camera } from "lucide-react";

interface CriteriaGridProps {
  acceptance_criteria: string;
  required_evidence: string;
  deliverable_description: string;
}

function parseCriteriaLines(text: string): string[] {
  return text.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
}

export function CriteriaGrid({ acceptance_criteria, required_evidence, deliverable_description }: CriteriaGridProps) {
  const criteriaLines = parseCriteriaLines(acceptance_criteria);
  const evidenceLines = parseCriteriaLines(required_evidence);
  const hasCriteriaList = acceptance_criteria.includes("\n");
  const hasEvidenceList = required_evidence.includes("\n");

  return (
    <div className="space-y-3">
      {/* Deliverable */}
      <div className="border border-[#182030] bg-[#0C1118]">
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#182030] bg-[#111722]">
          <FileText className="w-3.5 h-3.5 text-[#5C7090]" />
          <span className="manifest-label">DELIVERY MANIFEST — DELIVERABLE SCOPE</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-[#A0B4C8] text-sm leading-relaxed whitespace-pre-wrap">{deliverable_description}</p>
        </div>
      </div>

      {/* Acceptance Criteria */}
      <div className="border border-[#00C9E8]/25 bg-[#001E28]" style={{ borderLeft: "2px solid #00C9E8" }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#00C9E8]/20">
          <CheckSquare className="w-3.5 h-3.5 text-[#00C9E8]" />
          <span className="manifest-label text-[#00C9E8]">INSPECTION CRITERIA — ACCEPTANCE CONDITIONS</span>
        </div>
        <div className="px-4 py-3 space-y-2">
          {hasCriteriaList ? criteriaLines.map((line, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="font-mono text-[#00C9E8] text-[10px] mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, "0")}.</span>
              <span className="text-[#A0B4C8] text-sm">{line}</span>
            </div>
          )) : (
            <p className="text-[#A0B4C8] text-sm leading-relaxed">{acceptance_criteria}</p>
          )}
        </div>
      </div>

      {/* Required Evidence */}
      <div className="border border-[#FF5C1A]/25 bg-[#110E00]" style={{ borderLeft: "2px solid #F5C000" }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#F5C000]/20">
          <Camera className="w-3.5 h-3.5 text-[#F5C000]" />
          <span className="manifest-label text-[#F5C000]">EVIDENCE CRATE — REQUIRED PROOF</span>
        </div>
        <div className="px-4 py-3">
          {hasEvidenceList ? (
            <div className="space-y-2">
              {evidenceLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2.5 border border-[#F5C000]/15 bg-[#080B10] px-3 py-1.5">
                  <span className="font-mono text-[#F5C000] text-[9px] flex-shrink-0">PKG-{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[#A0B4C8] text-sm">{line}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#A0B4C8] text-sm leading-relaxed">{required_evidence}</p>
          )}
        </div>
      </div>
    </div>
  );
}
