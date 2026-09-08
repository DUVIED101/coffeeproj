"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCityLabel,
  type CityCode,
  type CityEntry,
} from "@bystrobarista/core/types/city";
import {
  listCitiesForPicker,
  searchCities,
} from "@bystrobarista/core/utils/cities";
import { MetroService } from "@bystrobarista/core/utils/metro";

type Props = {
  value: CityCode | undefined;
  onChange: (city: CityCode | undefined) => void;
  /** Adds an "Any city" row that reports `undefined` — used by filter bars. */
  allowAny?: boolean;
  className?: string;
};

const DEFAULT_TRIGGER =
  "rounded-input border border-line px-3 py-2 text-left text-sm hover:border-primary";

// Searchable city picker mirroring mobile's CityPicker: pinned metro cities
// first, then every other 100k+ city alphabetically.
export function CitySelect({
  value,
  onChange,
  allowAny,
  className,
}: Props): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo<
    Array<{ key: string; title?: string; data: readonly CityEntry[] }>
  >(() => {
    if (query.trim()) return [{ key: "search", data: searchCities(query) }];
    const { pinned, rest } = listCitiesForPicker();
    return [
      { key: "pinned", title: t("city.pinnedSection"), data: pinned },
      { key: "all", title: t("city.allSection"), data: rest },
    ];
  }, [query, t]);

  const close = (): void => {
    setQuery("");
    setOpen(false);
  };

  const select = (city: CityCode | undefined): void => {
    if (city !== value) onChange(city);
    close();
  };

  const label =
    value === undefined
      ? t("city.anyOption")
      : getCityLabel(value, i18n.language);
  const noResults = groups.every((group) => group.data.length === 0);

  const row = (city: CityEntry): React.JSX.Element => {
    const selected = city.code === value;
    return (
      <button
        key={city.code}
        type="button"
        onClick={() => select(city.code)}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left hover:bg-bg-secondary"
      >
        <span
          className={`flex-1 text-sm ${selected ? "font-semibold text-primary" : ""}`}
        >
          {getCityLabel(city.code, i18n.language)}
        </span>
        {MetroService.hasMetro(city.code) && (
          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs text-ink-secondary">
            {t("city.metroBadge")}
          </span>
        )}
        {selected && (
          <span aria-hidden="true" className="text-primary">
            ✓
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? DEFAULT_TRIGGER}
        aria-haspopup="dialog"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-card bg-white md:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-semibold">{t("city.placeholder")}</h2>
              <button
                type="button"
                onClick={close}
                className="text-sm font-medium text-primary"
              >
                {t("common.done")}
              </button>
            </div>

            <div className="px-4 py-3">
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("city.searchPlaceholder")}
                className="w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {allowAny && !query.trim() && (
                <button
                  type="button"
                  onClick={() => select(undefined)}
                  className="flex w-full items-center justify-between border-b border-line px-4 py-2.5 text-left hover:bg-bg-secondary"
                >
                  <span
                    className={`text-sm ${value === undefined ? "font-semibold text-primary" : ""}`}
                  >
                    {t("city.anyOption")}
                  </span>
                  {value === undefined && (
                    <span aria-hidden="true" className="text-primary">
                      ✓
                    </span>
                  )}
                </button>
              )}

              {noResults ? (
                <p className="px-4 py-6 text-center text-sm text-ink-secondary">
                  {t("city.noResults")}
                </p>
              ) : (
                groups.map((group) => (
                  <React.Fragment key={group.key}>
                    {group.title && (
                      <p className="bg-bg-secondary px-4 py-1.5 text-xs font-semibold text-ink-secondary">
                        {group.title}
                      </p>
                    )}
                    {group.data.map(row)}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
