import type { Notification } from "@bystrobarista/core/types/notification";

// Web twin of mobile's dispatchPayload (navigationRef.ts): maps a notification
// to the route its tap should open, branched on account type exactly like the
// RN tab dispatch. Falls back to the role's home feed when IDs are missing.
export const notificationHref = (
  notification: Notification,
  accountType: "barista" | "business",
): string => {
  const { kind } = notification;
  const data = notification.data;
  const isBusiness = accountType === "business";
  const home = isBusiness ? "/dashboard" : "/jobs";
  const applicants = data.jobId ? `/jobs/${data.jobId}/applicants` : home;

  switch (kind) {
    case "new_message":
    case "conversation_started":
      return data.conversationId ? `/chats/${data.conversationId}` : "/chats";
    case "job_offer_received":
      return data.offerId ? `/offers/${data.offerId}` : home;
    case "job_offer_accepted":
    case "job_offer_declined":
    case "new_application":
    case "application_withdrawn":
    case "shift_confirmed":
    case "shift_declined":
      return isBusiness ? applicants : home;
    case "application_accepted":
    case "application_rejected":
    case "work_completion_requested":
    case "work_completion_confirmed":
    case "shift_cancelled":
      return isBusiness ? applicants : "/applications";
    case "new_review":
      return "/profile";
    case "shift_reminder_24h":
    case "shift_reminder_3h":
      if (isBusiness) return applicants;
      return data.applicationId
        ? `/applications/${data.applicationId}`
        : "/applications";
    case "shift_confirmation_required":
      return data.applicationId
        ? `/applications/${data.applicationId}`
        : "/applications";
    case "shift_no_response_alert": {
      if (!data.applicationId) return "/shift-alerts";
      const params = new URLSearchParams({ applicationId: data.applicationId });
      if (data.jobTitle) params.set("jobTitle", data.jobTitle);
      if (data.shiftStartIso) params.set("shiftStart", data.shiftStartIso);
      return `/shift-alerts?${params.toString()}`;
    }
    case "dispute_filed":
      return data.disputeId ? `/disputes/${data.disputeId}` : "/disputes";
    default:
      return home;
  }
};
