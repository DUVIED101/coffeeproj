"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MetroService,
  type MetroStation,
} from "@bystrobarista/core/utils/metro";
import { METRO_ANY } from "@bystrobarista/core/config/metroFilter";
import { CITY_CODES, type CityCode } from "@bystrobarista/core/types/city";
import type { GeoPoint } from "@bystrobarista/core/types/business";

type Props = {
  open: boolean;
  city: CityCode;
  value: string[];
  userLocation?: GeoPoint;
  onCityChange: (city: CityCode) => void;
  onChange: (stations: string[]) => void;
  onClose: () => void;
};

const NEARBY_LIMIT = 5;

// Multi-select metro picker mirroring mobile's MetroSelector modal: city
// tabs, search, nearby-stations section, METRO_ANY sentinel semantics.
export function MetroFilterModal({
  open,
  city,
  value,
  userLocation,
  onCityChange,
  onChange,
  onClose,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const nearby = useMemo(() => {
    if (!userLocation || query.trim()) return [];
    return MetroService.getStationsByDistance(
      userLocation.latitude,
      userLocation.longitude,
      city,
      NEARBY_LIMIT,
    );
  }, [userLocation, query, city]);

  const rest = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed) return MetroService.searchStations(trimmed, city);
    const nearbyIds = new Set(nearby.map((s) => s.id));
    return MetroService.getAllStations(city).filter(
      (s) => !nearbyIds.has(s.id),
    );
  }, [query, city, nearby]);

  if (!open) return null;

  const toggleStation = (station: MetroStation): void => {
    // Picking a real station overrides the "Any" sentinel — they're
    // mutually exclusive intents (same as mobile).
    const cleaned = value.filter((s) => s !== METRO_ANY);
    onChange(
      cleaned.includes(station.name)
        ? cleaned.filter((s) => s !== station.name)
        : [...cleaned, station.name],
    );
  };

  const rowFor = (
    station: MetroStation & { distance?: number },
  ): React.JSX.Element => {
    const selected = value.includes(station.name);
    return (
      <button
        key={station.id}
        type="button"
        onClick={() => toggleStation(station)}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left hover:bg-bg-secondary"
      >
        <span
          aria-hidden="true"
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: station.lineColor }}
        />
        <span className="flex-1">
          <span className="block text-sm">{station.name}</span>
          <span className="block text-xs text-ink-secondary">
            {station.line}
            {typeof station.distance === "number" &&
              ` · ${MetroService.formatDistance(station.distance)}`}
          </span>
        </span>
        {selected && (
          <span aria-hidden="true" className="text-primary">
            ✓
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-card bg-white md:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold">{t("metro.titleMulti")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-primary"
          >
            {t("common.done")}
            {value.filter((s) => s !== METRO_ANY).length > 0 &&
              ` (${value.filter((s) => s !== METRO_ANY).length})`}
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          {CITY_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (code !== city) {
                  onCityChange(code);
                  onChange([]);
                  setQuery("");
                }
              }}
              className={`rounded-input px-3 py-1.5 text-sm font-medium ${
                code === city
                  ? "bg-primary text-white"
                  : "bg-bg-secondary text-ink"
              }`}
            >
              {t(`city.codes.${code}`)}
            </button>
          ))}
        </div>

        <div className="px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("metro.searchPlaceholder")}
            className="w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {!query.trim() && (
            <button
              type="button"
              onClick={() => {
                onChange([METRO_ANY]);
                onClose();
              }}
              className="flex w-full items-center justify-between border-b border-line px-4 py-2.5 text-left hover:bg-bg-secondary"
            >
              <span>
                <span className="block text-sm font-medium">
                  {t("metro.anyOptionTitle")}
                </span>
                <span className="block text-xs text-ink-secondary">
                  {t("metro.anyOptionSubtitle")}
                </span>
              </span>
              {value.includes(METRO_ANY) && (
                <span aria-hidden="true" className="text-primary">
                  ✓
                </span>
              )}
            </button>
          )}

          {nearby.length > 0 && (
            <>
              <p className="bg-bg-secondary px-4 py-1.5 text-xs font-semibold text-ink-secondary">
                {t("metro.nearbySection")}
              </p>
              {nearby.map(rowFor)}
              <p className="bg-bg-secondary px-4 py-1.5 text-xs font-semibold text-ink-secondary">
                {t("metro.allSection")}
              </p>
            </>
          )}

          {rest.length === 0 && query.trim() ? (
            <p className="px-4 py-6 text-center text-sm text-ink-secondary">
              {t("metro.noResults")}
            </p>
          ) : (
            rest.map(rowFor)
          )}
        </div>
      </div>
    </div>
  );
}
