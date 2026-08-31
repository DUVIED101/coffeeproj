import type { DisputeStatus } from "@bystrobarista/core/types/application";

// Mobile parity: DisputeDetailsScreen / MyDisputesScreen badge colors.
export const DISPUTE_STATUS_BADGE: Record<DisputeStatus, string> = {
  submitted: "bg-[#F59E0B]",
  under_review: "bg-[#3B82F6]",
  resolved: "bg-[#10B981]",
  dismissed: "bg-[#6B7280]",
};

export const DISPUTE_SEVERITY_BORDER: Record<string, string> = {
  warning: "border-[#F59E0B] text-[#F59E0B]",
  serious: "border-[#FF8C00] text-[#FF8C00]",
  critical: "border-[#EF4444] text-[#EF4444]",
};
