"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  JobOfferService,
  JobOfferJobUnavailableError,
  JobOfferTerminalError,
} from "@bystrobarista/core/services/JobOfferService";
import type { JobOfferId } from "@bystrobarista/core/types/ids";

// Port of JobOfferScreen: a single offer opened from a notification /
// deep link, with accept ("interested") and decline actions. `?action=`
// carries a push notification action button (web twin of mobile's
// pendingOfferActionsQueue) and fires the response once the offer loads.
function JobOfferView(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ offerId: string }>();
  const searchParams = useSearchParams();
  const pushAction = searchParams.get("action");
  const offerId = params.offerId as JobOfferId;
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRespondedRef = useRef(false);

  const offerQuery = useQuery({
    queryKey: ["offers", "byId", offerId],
    queryFn: () => JobOfferService.getOfferById(offerId),
  });
  const offer = offerQuery.data;

  const respond = async (response: "accepted" | "declined"): Promise<void> => {
    if (!offer) return;
    setResponding(true);
    setError(null);
    try {
      const result = await JobOfferService.respondToOffer(offer.id, response);
      if (result.status === "accepted") {
        router.push(`/chats?applicationId=${result.applicationId}`);
      } else {
        router.push("/jobs");
      }
    } catch (err) {
      if (err instanceof JobOfferJobUnavailableError) {
        setError(t("jobOffer.jobUnavailable"));
      } else if (err instanceof JobOfferTerminalError) {
        setError(t("jobOffer.alreadyResolved"));
      } else {
        setError(t("jobOffer.respondFailure"));
      }
      setResponding(false);
    }
  };

  useEffect(() => {
    if (
      !offer ||
      offer.status !== "pending" ||
      autoRespondedRef.current ||
      (pushAction !== "accepted" && pushAction !== "declined")
    ) {
      return;
    }
    autoRespondedRef.current = true;
    void respond(pushAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, pushAction]);

  if (offerQuery.isPending) {
    return (
      <div className="mx-auto h-60 max-w-2xl animate-pulse rounded-card bg-bg-secondary" />
    );
  }

  if (!offer) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("jobOffer.notFound")}
      </p>
    );
  }

  const isPending = offer.status === "pending";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{t("jobOffer.title")}</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        {t("jobOffer.fromBusiness", { name: offer.businessName ?? "" })}
      </p>

      {offer.message && (
        <div className="mt-4 rounded-card border border-line bg-bg-secondary p-4">
          <p className="mb-1 text-xs font-semibold text-ink-secondary">
            {t("jobOffer.businessNote")}
          </p>
          <p className="whitespace-pre-line text-sm">{offer.message}</p>
        </div>
      )}

      {offer.job && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <p className="font-semibold">{offer.job.title}</p>
          <p className="text-sm text-ink-secondary">
            {offer.job.businessName}
            {offer.job.branchName && ` • ${offer.job.branchName}`}
          </p>
          <Link
            href={`/jobs/${offer.jobId}`}
            className="mt-2 inline-block text-sm text-primary"
          >
            {t("jobDetails.description")} →
          </Link>
        </div>
      )}

      {!isPending && (
        <div className="mt-4 rounded-card border border-[#FCD34D] bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
          {t(`jobOffer.statusBanner.${offer.status}`)}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-error">
          {error}
        </p>
      )}

      {isPending && (
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void respond("declined")}
            disabled={responding}
            className="flex-1 rounded-card border border-error px-4 py-3 text-sm font-semibold text-error disabled:opacity-50"
          >
            {t("jobOffer.notInterested")}
          </button>
          <button
            type="button"
            onClick={() => void respond("accepted")}
            disabled={responding}
            className="flex-1 rounded-card bg-success px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("jobOffer.interested")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function JobOfferPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <JobOfferView />
    </Suspense>
  );
}
