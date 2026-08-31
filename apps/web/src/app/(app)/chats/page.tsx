"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ChatService } from "@bystrobarista/core/services/ChatService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useBlockedUsersStore } from "@bystrobarista/core/stores/blockedUsersStore";
import type { Conversation } from "@bystrobarista/core/types/chat";
import { transformedImageUrl } from "@/lib/imageTransform";

const ARCHIVED_STATUSES: readonly string[] = [
  "rejected",
  "withdrawn",
  "completed",
];

const STATUS_DOT: Record<string, string> = {
  accepted: "bg-[#10B981]",
  rejected: "bg-[#EF4444]",
  pending: "bg-[#F59E0B]",
  under_review: "bg-[#F59E0B]",
  withdrawn: "bg-[#6B7280]",
};

const isArchived = (status?: string): boolean =>
  Boolean(status && ARCHIVED_STATUSES.includes(status));

const nameInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
};

// Entry point from applications/applicants: /chats?applicationId=X resolves
// (or backfills) the conversation, then lands on /chats/[conversationId] —
// the web twin of mobile's Chat route accepting applicationId.
function ApplicationRedirect({
  applicationId,
}: {
  applicationId: string;
}): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const conversation =
          (await ChatService.getConversationByApplication(applicationId)) ??
          (await ChatService.createConversation(applicationId));
        if (!cancelled) router.replace(`/chats/${conversation.id}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, router]);

  if (failed) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("chat.loadFailed")}
      </p>
    );
  }
  return <div className="py-16 text-center text-sm text-ink-secondary">…</div>;
}

function ConversationsList(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const accountType = user?.accountType;
  const isBarista = accountType === "barista";
  const [tab, setTab] = useState<"active" | "archive">("active");

  const blocked = useBlockedUsersStore((s) => s.blocked);
  const hydrateBlocked = useBlockedUsersStore((s) => s.hydrate);
  useEffect(() => {
    void hydrateBlocked();
  }, [hydrateBlocked]);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", userId, accountType],
    queryFn: () =>
      ChatService.getConversations(
        userId as string,
        accountType as "barista" | "business",
      ),
    enabled: Boolean(userId && accountType) && !applicationId,
  });

  if (applicationId) {
    return <ApplicationRedirect applicationId={applicationId} />;
  }

  const blockedIds = new Set(blocked.map((b) => b.userId));
  const visible = (conversationsQuery.data ?? []).filter(
    (c) => !blockedIds.has(isBarista ? c.businessId : c.baristaId),
  );
  const archived = visible.filter((c) => isArchived(c.applicationStatus));
  const active = visible.filter((c) => !isArchived(c.applicationStatus));
  const shown = tab === "active" ? active : archived;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("chats.title")}</h1>

      <div className="mb-4 flex gap-2">
        {(["active", "archive"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-chip px-4 py-1.5 text-sm font-medium ${
              tab === key
                ? "bg-primary text-white"
                : "bg-bg-secondary text-ink-secondary"
            }`}
          >
            {key === "active"
              ? t("conversations.tabActive", { count: active.length })
              : t("conversations.tabArchive", { count: archived.length })}
          </button>
        ))}
      </div>

      {conversationsQuery.isPending ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="mb-2 h-20 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))
      ) : shown.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-lg font-semibold text-ink-secondary">
            {t("conversations.emptyTitle")}
          </p>
          <p className="text-sm text-ink-secondary">
            {tab === "archive"
              ? t("conversations.emptyArchive")
              : isBarista
                ? t("conversations.emptyBarista")
                : t("conversations.emptyBusiness")}
          </p>
        </div>
      ) : (
        shown.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            isBarista={isBarista}
            currentUserId={userId as string}
            locale={locale}
          />
        ))
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  isBarista,
  currentUserId,
  locale,
}: {
  conversation: Conversation;
  isBarista: boolean;
  currentUserId: string;
  locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const otherPartyName = isBarista
    ? conversation.businessName
    : conversation.baristaName;
  const avatarUrl = isBarista
    ? conversation.businessLogoUrl
    : conversation.baristaAvatarUrl;
  const title =
    conversation.jobTitle || otherPartyName || t("chat.fallbackTitle");
  const unreadCount = isBarista
    ? conversation.unreadCountBarista
    : conversation.unreadCountBusiness;
  const senderLabel =
    conversation.lastMessageSenderId === currentUserId
      ? t("conversations.youPrefix")
      : otherPartyName;

  return (
    <Link
      href={`/chats/${conversation.id}`}
      className="mb-2 flex items-center gap-3 rounded-card border border-line bg-white p-3 hover:bg-bg-secondary"
    >
      {avatarUrl ? (
        <img
          src={transformedImageUrl(avatarUrl, 96)}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full bg-bg-secondary object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          {nameInitials(otherPartyName ?? "")}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {conversation.applicationStatus && (
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${
                STATUS_DOT[conversation.applicationStatus] ?? "bg-ink-secondary"
              }`}
            />
          )}
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
        {otherPartyName && conversation.jobTitle !== otherPartyName && (
          <p className="truncate text-xs text-ink-secondary">
            {otherPartyName}
          </p>
        )}
        {conversation.lastMessageText && (
          <p className="truncate text-xs text-ink-secondary">
            {senderLabel}: {conversation.lastMessageText}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {conversation.lastMessageAt && (
          <span className="text-[11px] text-ink-secondary">
            {new Date(conversation.lastMessageAt).toLocaleString(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {unreadCount > 0 && (
          <span
            aria-label={t("conversations.unreadA11y", { count: unreadCount })}
            className="rounded-chip bg-[#EF4444] px-2 py-0.5 text-xs font-semibold text-white"
          >
            {unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ChatsPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ConversationsList />
    </Suspense>
  );
}
