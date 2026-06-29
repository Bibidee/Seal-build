"use client";

interface CriteriaGridProps {
  acceptance_criteria: string;
  required_evidence: string;
  deliverable_description: string;
}

export function CriteriaGrid({ acceptance_criteria, required_evidence, deliverable_description }: CriteriaGridProps) {
  return (
    <div className="grid gap-4">
      <div className="bg-[#0d1829] border border-[#1a2540] rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-2">Deliverable</div>
        <p className="text-[#CBD5E1] text-sm leading-relaxed whitespace-pre-wrap">{deliverable_description}</p>
      </div>

      <div className="bg-[#07080C]/60 border border-[#E0B64B]/20 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-[#E0B64B] mb-3">Acceptance Criteria</div>
        <div className="space-y-2">
          {acceptance_criteria.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E0B64B] mt-1.5 flex-shrink-0" />
              <span className="text-[#CBD5E1] text-sm">{line.replace(/^[-*•]\s*/, "")}</span>
            </div>
          ))}
          {!acceptance_criteria.includes("\n") && (
            <p className="text-[#CBD5E1] text-sm leading-relaxed">{acceptance_criteria}</p>
          )}
        </div>
      </div>

      <div className="bg-[#07080C]/60 border border-[#22D3EE]/20 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-[#22D3EE] mb-3">Required Evidence</div>
        <div className="space-y-2">
          {required_evidence.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] mt-1.5 flex-shrink-0" />
              <span className="text-[#CBD5E1] text-sm">{line.replace(/^[-*•]\s*/, "")}</span>
            </div>
          ))}
          {!required_evidence.includes("\n") && (
            <p className="text-[#CBD5E1] text-sm leading-relaxed">{required_evidence}</p>
          )}
        </div>
      </div>
    </div>
  );
}
