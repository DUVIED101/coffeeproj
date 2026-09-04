"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  mdiAccountAlertOutline,
  mdiAccountClockOutline,
  mdiAccountOffOutline,
  mdiAccountPlusOutline,
  mdiAccountRemoveOutline,
  mdiAlertCircleOutline,
  mdiBadgeAccountOutline,
  mdiBellOffOutline,
  mdiBriefcaseCheckOutline,
  mdiBriefcasePlusOutline,
  mdiBriefcaseRemoveOutline,
  mdiCalendarAlert,
  mdiCalendarCheck,
  mdiCalendarClock,
  mdiCalendarQuestion,
  mdiCalendarRemove,
  mdiCheckCircleOutline,
  mdiChevronDown,
  mdiChevronUp,
  mdiClockOutline,
  mdiCloseCircleOutline,
  mdiMessagePlusOutline,
  mdiMessageTextOutline,
  mdiStarOutline,
  mdiTrashCanOutline,
} from "@mdi/js";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { ConversationId } from "@bystrobarista/core/types/chat";
import type { UserId } from "@bystrobarista/core/types/ids";
import type {
  Notification,
  NotificationKind,
} from "@bystrobarista/core/types/notification";
import { MdiIcon } from "@/components/MdiIcon";
import { notificationHref } from "@/lib/notificationRoute";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

type FeedItem =
  | { type: "single"; notification: Notification }
  | { type: "group"; conversationId: ConversationId; items: Notification[] };

// Same run-length grouping as mobile: consecutive new_message notifications
// from one conversation collapse into an expandable group.
const groupChatNotifications = (notifications: Notification[]): FeedItem[] => {
  const result: FeedItem[] = [];
  let i = 0;
  while (i < notifications.length) {
    const current = notifications[i];
    const convId = current.data.conversationId as ConversationId | undefined;
    if (current.kind !== "new_message" || !convId) {
      result.push({ type: "single", notification: current });
      i++;
      continue;
    }
    let j = i;
    while (
      j < notifications.length &&
      notifications[j].kind === "new_message" &&
      (notifications[j].data.conversationId as ConversationId | undefined) ===
        convId
    ) {
      j++;
    }
    const run = notifications.slice(i, j);
    if (run.length === 1) {
      result.push({ type: "single", notification: run[0] });
    } else {
      result.push({ type: "group", conversationId: convId, items: run });
    }
    i = j;
  }
  return result;
};

const ICON_BY_KIND: Record<NotificationKind, string> = {
  new_message: mdiMessageTextOutline,
  application_accepted: mdiCheckCircleOutline,
  application_rejected: mdiCloseCircleOutline,
  work_completion_requested: mdiClockOutline,
  work_completion_confirmed: mdiBriefcaseCheckOutline,
  new_application: mdiAccountPlusOutline,
  application_withdrawn: mdiAccountRemoveOutline,
  shift_cancelled: mdiCalendarRemove,
  new_review: mdiStarOutline,
  conversation_started: mdiMessagePlusOutline,
  job_offer_received: mdiBriefcasePlusOutline,
  job_offer_accepted: mdiBriefcaseCheckOutline,
  job_offer_declined: mdiBriefcaseRemoveOutline,
  shift_reminder_24h: mdiCalendarClock,
  shift_reminder_3h: mdiCalendarClock,
  shift_confirmation_required: mdiCalendarQuestion,
  shift_confirmed: mdiCalendarCheck,
  shift_declined: mdiCalendarRemove,
  shift_no_response_alert: mdiCalendarAlert,
  dispute_filed: mdiAlertCircleOutline,
  employment_started: mdiBadgeAccountOutline,
  employment_start_due: mdiAccountClockOutline,
  employment_end_requested: mdiAccountAlertOutline,
  employment_ended: mdiAccountOffOutline,
};

function NotificationCard({
  notification,
  locale,
  onPress,
  compact = false,
}: {
  notification: Notification;
  locale: string;
  onPress: (n: Notification) => void;
  compact?: boolean;
}): React.JSX.Element {
  const unread = !notification.readAt;
  return (
    <button
      type="button"
      onClick={() => onPress(notification)}
      className={`relative flex w-full items-start gap-3 rounded-card border border-line p-3 text-left ${
        unread ? "bg-white" : "bg-bg-secondary/60"
      } ${compact ? "mb-1.5" : "mb-2"} hover:border-primary/40`}
    >
      <span className="mt-0.5 shrink-0 text-primary">
        <MdiIcon path={ICON_BY_KIND[notification.kind]} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        {notification.title && (
          <span className="block truncate text-sm font-semibold">
            {notification.title}
          </span>
        )}
        {notification.body && (
          <span className="block text-sm text-ink-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
            {notification.body}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] text-ink-secondary">
          {new Date(notification.createdAt).toLocaleString(locale, {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </span>
      {unread && (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#EF4444]"
        />
      )}
    </button>
  );
}

export default function NotificationsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id as UserId | undefined;
  const accountType = user?.accountType ?? "barista";

  const notifications = useNotificationFeedStore((s) => s.notifications);
  const unreadCount = useNotificationFeedStore((s) => s.unreadCount);
  const isLoading = useNotificationFeedStore((s) => s.isLoading);

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handlePress = useCallback(
    (notification: Notification) => {
      const store = useNotificationFeedStore.getState();
      void store.markAsRead(notification.id).catch(() => {});
      router.push(notificationHref(notification, accountType));
    },
    [router, accountType],
  );

  const handleGroupPress = useCallback(
    (items: Notification[], conversationId: ConversationId) => {
      if (!userId) return;
      const store = useNotificationFeedStore.getState();
      void store.markConversationAsRead(userId, conversationId).catch(() => {});
      router.push(notificationHref(items[0], accountType));
    },
    [router, accountType, userId],
  );

  const handleClearAll = (): void => {
    if (!userId) return;
    if (
      window.confirm(
        `${t("notifications.feed.clearConfirmTitle")}\n${t("notifications.feed.clearConfirmBody")}`,
      )
    ) {
      void useNotificationFeedStore
        .getState()
        .clearAll(userId)
        .catch(() => {});
    }
  };

  const visible = unreadOnly
    ? notifications.filter((n) => !n.readAt)
    : notifications;
  const feedItems = groupChatNotifications(visible);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("notifications.feed.title")}</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && userId && (
            <button
              type="button"
              onClick={() =>
                void useNotificationFeedStore
                  .getState()
                  .markAllAsRead(userId)
                  .catch(() => {})
              }
              className="text-sm font-medium text-primary"
            >
              {t("notifications.feed.markAllRead")}
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              aria-label={t("notifications.feed.clearAll")}
              title={t("notifications.feed.clearAll")}
              className="rounded-input p-1.5 text-ink-secondary hover:text-[#EF4444]"
            >
              <MdiIcon path={mdiTrashCanOutline} size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          className={`rounded-chip px-4 py-1.5 text-sm font-medium ${
            !unreadOnly
              ? "bg-primary text-white"
              : "bg-bg-secondary text-ink-secondary"
          }`}
        >
          {t("notifications.feed.filterAll")}
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          className={`rounded-chip px-4 py-1.5 text-sm font-medium ${
            unreadOnly
              ? "bg-primary text-white"
              : "bg-bg-secondary text-ink-secondary"
          }`}
        >
          {t("notifications.feed.filterUnread", { count: unreadCount })}
        </button>
      </div>

      {isLoading && notifications.length === 0 ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-2 h-20 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))
      ) : feedItems.length === 0 ? (
        <div className="py-16 text-center text-ink-secondary">
          <span className="mx-auto mb-3 block w-fit">
            <MdiIcon path={mdiBellOffOutline} size={40} />
          </span>
          <p>
            {unreadOnly
              ? t("notifications.feed.emptyUnread")
              : t("notifications.feed.empty")}
          </p>
        </div>
      ) : (
        feedItems.map((item) => {
          if (item.type === "single") {
            return (
              <NotificationCard
                key={item.notification.id}
                notification={item.notification}
                locale={locale}
                onPress={handlePress}
              />
            );
          }

          const latest = item.items[0];
          const groupKey = `${item.conversationId}:${latest.id}`;
          const expanded = expandedGroups.has(groupKey);
          const unreadInGroup = item.items.filter((n) => !n.readAt).length;
          return (
            <div
              key={groupKey}
              className="mb-2 rounded-card border border-line bg-white"
            >
              <div className="flex items-start">
                <button
                  type="button"
                  onClick={() =>
                    handleGroupPress(item.items, item.conversationId)
                  }
                  className="relative flex min-w-0 flex-1 items-start gap-3 p-3 text-left"
                >
                  <span className="mt-0.5 shrink-0 text-primary">
                    <MdiIcon path={mdiMessageTextOutline} size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    {latest.title && (
                      <span className="block truncate text-sm font-semibold">
                        {latest.title}
                      </span>
                    )}
                    <span className="block text-sm text-ink-secondary">
                      {t("notifications.feed.chatGroupBody", {
                        count: item.items.length,
                      })}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-secondary">
                      {new Date(latest.createdAt).toLocaleString(locale, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  {unreadInGroup > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#EF4444]"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      if (next.has(groupKey)) next.delete(groupKey);
                      else next.add(groupKey);
                      return next;
                    })
                  }
                  aria-label={
                    expanded
                      ? t("notifications.feed.collapseGroupA11y")
                      : t("notifications.feed.expandGroupA11y")
                  }
                  className="p-3 text-ink-secondary"
                >
                  <MdiIcon
                    path={expanded ? mdiChevronUp : mdiChevronDown}
                    size={20}
                  />
                </button>
              </div>
              {expanded && (
                <div className="border-t border-line p-2">
                  {item.items.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      locale={locale}
                      onPress={handlePress}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
