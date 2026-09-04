"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ChatService } from "@bystrobarista/core/services/ChatService";
import { ReportService } from "@bystrobarista/core/services/ReportService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useBlockedUsersStore } from "@bystrobarista/core/stores/blockedUsersStore";
import { useChatUnreadStore } from "@bystrobarista/core/stores/chatUnreadStore";
import type {
  Conversation,
  ConversationId,
  Message,
} from "@bystrobarista/core/types/chat";
import type { UserId } from "@bystrobarista/core/types/ids";
import type { ReportReasonCode } from "@bystrobarista/core/types/userReport";
import {
  formatDateHeader,
  isSameDay,
} from "@bystrobarista/core/utils/dateUtils";
import { getPlatform } from "@bystrobarista/core/platform";
import { formatDateOnly } from "@/lib/dates";
import { transformedImageUrl } from "@/lib/imageTransform";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

const MESSAGE_MAX_LENGTH = 500;

const MESSAGE_REPORT_REASONS = [
  "spam",
  "harassment",
  "offensive_photo",
  "other",
] as const;

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
// split() needs the global flag; test() must not have it (lastIndex is sticky
// across calls and would skip every other URL).
const URL_TEST = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/;

// Same rendering as mobile: URLs inside a message become tappable links.
function MessageText({ text }: { text: string }): React.JSX.Element {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (URL_TEST.test(part)) {
          const href = part.startsWith("www.") ? `https://${part}` : part;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all"
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function ReportMessageModal({
  messageId,
  onClose,
}: {
  messageId: string;
  onClose: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReasonCode | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await ReportService.submitReport({
        targetType: "message",
        targetId: messageId,
        reasonCode: reason,
        details: details || undefined,
      });
      getPlatform().alert.show(t("report.success"), "");
      onClose();
    } catch {
      getPlatform().alert.show(t("common.error"), t("common.tryAgain"));
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-card bg-white p-5">
        <h2 className="mb-1 text-lg font-bold">{t("report.title")}</h2>
        <p className="mb-3 text-sm text-ink-secondary">
          {t("report.chooseReason")}
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {MESSAGE_REPORT_REASONS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setReason(code)}
              className={`rounded-chip border px-3 py-1.5 text-sm ${
                reason === code
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-white text-ink"
              }`}
            >
              {t(`report.reason.${code}`)}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t("report.detailsPlaceholder")}
          rows={3}
          maxLength={500}
          className="mb-4 w-full rounded-input border border-line p-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-line px-4 py-2 text-sm font-medium"
          >
            {t("report.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!reason || submitting}
            className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("report.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatConversationPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId as ConversationId;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const accountType = user?.accountType;
  const isBarista = accountType === "barista";

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  // Supabase WebSockets die when the tab sleeps; bump to resubscribe on wake
  // (web twin of mobile's AppState-driven reconnect).
  const [reconnectVersion, setReconnectVersion] = useState(0);

  const blockUser = useBlockedUsersStore((s) => s.block);
  const refreshChatUnread = useChatUnreadStore((s) => s.refresh);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const markEverythingRead = useCallback(() => {
    if (!userId || !accountType) return;
    void ChatService.markAsRead(conversationId, userId).catch(() => {});
    void refreshChatUnread(userId, accountType).catch(() => {});
    void useNotificationFeedStore
      .getState()
      .markConversationAsRead(userId as UserId, conversationId)
      .catch(() => {});
  }, [conversationId, userId, accountType, refreshChatUnread]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await ChatService.getConversationById(conversationId);
        if (cancelled) return;
        if (!loaded) {
          setLoadState("error");
          return;
        }
        const loadedMessages = await ChatService.getMessages(loaded.id);
        if (cancelled) return;
        setConversation(loaded);
        setMessages([...loadedMessages].reverse());
        setLoadState("ready");
        markEverythingRead();
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, userId, markEverythingRead]);

  useEffect(() => {
    if (!userId || loadState !== "ready") return;
    const channel = ChatService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        setMessages((prev) =>
          prev.some((m) => m.id === newMessage.id)
            ? prev
            : [...prev, newMessage],
        );
        if (newMessage.senderId !== userId) markEverythingRead();
      },
    );
    return () => {
      ChatService.unsubscribeFromMessages(channel);
    };
  }, [conversationId, userId, loadState, markEverythingRead, reconnectVersion]);

  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === "visible") {
        setReconnectVersion((v) => v + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const otherPartyName = isBarista
    ? conversation?.businessName
    : conversation?.baristaName;
  const otherPartyAvatar = isBarista
    ? conversation?.businessLogoUrl
    : conversation?.baristaAvatarUrl;
  const otherUserId = isBarista
    ? conversation?.businessId
    : conversation?.baristaId;
  const profileHref = conversation
    ? isBarista
      ? `/businesses/${conversation.businessId}`
      : `/baristas/${conversation.baristaId}`
    : null;

  const applicationStatus = conversation?.applicationStatus;
  const isClosed =
    applicationStatus === "rejected" || applicationStatus === "withdrawn";
  const businessHasMessaged = useMemo(
    () =>
      Boolean(conversation?.firstBusinessMessageAt) ||
      messages.some((m) => m.senderId === conversation?.businessId),
    [conversation, messages],
  );
  const mustWaitForBusiness =
    isBarista && !businessHasMessaged && applicationStatus !== "accepted";

  const handleSend = async (): Promise<void> => {
    const text = messageText.trim();
    if (!text || isSending || !conversation || !userId) return;
    setIsSending(true);
    setMessageText("");
    try {
      const sent = await ChatService.sendMessage({
        conversationId: conversation.id,
        senderId: userId,
        messageText: text,
      });
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent],
      );
      inputRef.current?.focus();
    } catch {
      setMessageText(text);
      getPlatform().alert.show(t("common.error"), t("common.tryAgain"));
    } finally {
      setIsSending(false);
    }
  };

  const handleBlock = (): void => {
    if (!otherUserId) return;
    const name = otherPartyName || t("settings.blockedUsers.unknownUser");
    if (
      window.confirm(
        `${t("chat.blockTitle")}\n${t("chat.blockBody", { name })}`,
      )
    ) {
      void blockUser(otherUserId, name);
      router.push("/chats");
    }
  };

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-2xl animate-pulse">
        <div className="mb-4 h-8 w-1/2 rounded bg-bg-secondary" />
        <div className="h-64 rounded-card bg-bg-secondary" />
      </div>
    );
  }

  if (loadState === "error" || !conversation) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("chat.loadFailed")}
      </p>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-2xl flex-col md:h-[calc(100dvh-6.5rem)]">
      <div className="flex items-center gap-3 border-b border-line pb-3">
        {profileHref && (
          <Link href={profileHref} className="flex items-center gap-3">
            {otherPartyAvatar ? (
              <img
                src={transformedImageUrl(otherPartyAvatar, 80)}
                alt=""
                className="h-10 w-10 rounded-full bg-bg-secondary object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {(otherPartyName ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">
                {otherPartyName ||
                  conversation.jobTitle ||
                  t("chat.fallbackTitle")}
              </p>
              {conversation.jobTitle &&
                conversation.jobTitle !== otherPartyName && (
                  <p className="text-xs text-ink-secondary">
                    {conversation.jobTitle}
                  </p>
                )}
            </div>
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isBarista && (
            <Link
              href={`/businesses/${conversation.businessId}/jobs`}
              className="rounded-input border border-line px-3 py-1.5 text-sm font-medium"
            >
              {t("chat.headerJobsAction")}
            </Link>
          )}
          <button
            type="button"
            onClick={handleBlock}
            className="rounded-input border border-line px-3 py-1.5 text-sm font-medium text-[#EF4444]"
          >
            {t("chat.blockCta")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-1 font-semibold text-ink-secondary">
              {t("chat.emptyTitle")}
            </p>
            <p className="text-sm text-ink-secondary">
              {t("chat.emptySubtitle")}
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === userId;
            const messageDate = new Date(message.createdAt);
            const showDateHeader =
              index === 0 ||
              !isSameDay(new Date(messages[index - 1].createdAt), messageDate);
            return (
              <React.Fragment key={message.id}>
                {showDateHeader && (
                  <p className="my-3 text-center text-xs text-ink-secondary">
                    {formatDateHeader(messageDate)}
                  </p>
                )}
                <div
                  className={`group mb-1.5 flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-[18px] px-3 py-2 ${
                      isOwn
                        ? "rounded-br-[4px] bg-primary text-white"
                        : "rounded-bl-[4px] bg-[#E5E7EB] text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-line break-words text-sm">
                      <MessageText text={message.messageText} />
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] ${
                        isOwn
                          ? "text-right text-white/80"
                          : "text-left text-ink-secondary"
                      }`}
                    >
                      {messageDate.toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!isOwn && (
                    <button
                      type="button"
                      onClick={() => setReportMessageId(message.id)}
                      aria-label={t("report.buttonLabel")}
                      title={t("report.buttonLabel")}
                      className="ml-1 self-center text-ink-secondary opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      ⋯
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {conversation.jobType === "permanent" &&
        conversation.employmentStatus === "ended" && (
          <p className="mb-2 rounded-card bg-bg-secondary px-4 py-2 text-center text-sm text-ink-secondary">
            {t("chat.employmentEnded", {
              date: conversation.employmentEndedAt
                ? formatDateOnly(conversation.employmentEndedAt, locale)
                : "",
            })}
          </p>
        )}

      {isClosed ? (
        <div className="rounded-card bg-[#FEF2F2] p-4 text-center">
          <p className="font-semibold text-[#991B1B]">
            {t("chat.closed.title")}
          </p>
          <p className="text-sm text-[#991B1B]">
            {applicationStatus === "withdrawn"
              ? t("chat.closed.cancelled")
              : t("chat.closed.rejected")}
          </p>
        </div>
      ) : mustWaitForBusiness ? (
        <div className="rounded-card bg-bg-secondary p-4 text-center">
          <p className="font-semibold">{t("chat.waitingForBusiness.title")}</p>
          <p className="text-sm text-ink-secondary">
            {t("chat.waitingForBusiness.subtitle")}
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-end gap-2 border-t border-line pt-3"
        >
          <textarea
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={t("chat.inputPlaceholder")}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={1}
            className="max-h-24 flex-1 resize-none rounded-input border border-line p-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="rounded-input bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("chat.send")}
          </button>
        </form>
      )}

      {reportMessageId && (
        <ReportMessageModal
          messageId={reportMessageId}
          onClose={() => setReportMessageId(null)}
        />
      )}
    </div>
  );
}
