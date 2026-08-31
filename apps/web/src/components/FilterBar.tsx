"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { JobFilters } from "@bystrobarista/core/types/job";
import type { GeoPoint } from "@bystrobarista/core/types/business";
import { DEFAULT_CITY, type CityCode } from "@bystrobarista/core/types/city";
import { METRO_ANY } from "@bystrobarista/core/config/metroFilter";
import { MetroFilterModal } from "./MetroFilterModal";

type Props = {
  filters: JobFilters;
  userLocation?: GeoPoint;
  onChange: (filters: JobFilters) => void;
};

const DISTANCE_OPTIONS_KM = [5, 10, 25, 50];

const chip = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

// Web port of mobile's FilterBar: jobType chips, metro multi-select (with
// city tabs inside the modal), distance chips when geolocation is available,
// and a from-date input. METRO_ANY is stripped before filters reach the
// search RPC, exactly like mobile.
export function FilterBar({
  filters,
  userLocation,
  onChange,
}: Props): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const [metroOpen, setMetroOpen] = useState(false);
  const [metroSelection, setMetroSelection] = useState<string[]>([]);
  const [city, setCity] = useState<CityCode>(filters.city ?? DEFAULT_CITY);

  const applyMetro = (stations: string[]): void => {
    setMetroSelection(stations);
    const cleaned = stations.filter((s) => s !== METRO_ANY);
    onChange({
      ...filters,
      city,
      metroStations: cleaned.length > 0 ? cleaned : undefined,
    });
  };

  const handleCityChange = (next: CityCode): void => {
    setCity(next);
    setMetroSelection([]);
    onChange({ ...filters, city: next, metroStations: undefined });
  };

  const metroLabel =
    metroSelection.includes(METRO_ANY) || metroSelection.length === 0
      ? t("filters.metroStation")
      : metroSelection.length === 1
        ? metroSelection[0]
        : t("metro.selectedCount", { count: metroSelection.length });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {(["all", "temporary", "permanent"] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() =>
            onChange({ ...filters, jobType: type === "all" ? undefined : type })
          }
          className={chip(
            type === "all" ? filters.jobType == null : filters.jobType === type,
          )}
        >
          {t(`filters.jobType.${type}`)}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setMetroOpen(true)}
        className={chip((filters.metroStations?.length ?? 0) > 0)}
      >
        Ⓜ {metroLabel}
      </button>

      {userLocation &&
        DISTANCE_OPTIONS_KM.map((km) => (
          <button
            key={km}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                maxDistance:
                  filters.maxDistance === km * 1000 ? undefined : km * 1000,
              })
            }
            className={chip(filters.maxDistance === km * 1000)}
          >
            {t("filters.distanceKm", { km })}
          </button>
        ))}

      <label
        className={`${chip(Boolean(filters.startDateMinimum))} cursor-pointer`}
      >
        {filters.startDateMinimum
          ? new Date(filters.startDateMinimum).toLocaleDateString(locale)
          : t("filters.fromDate")}
        <input
          type="date"
          className="sr-only"
          value={filters.startDateMinimum ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              startDateMinimum: e.target.value || undefined,
            })
          }
        />
      </label>

      {(filters.jobType ||
        filters.metroStations?.length ||
        filters.maxDistance ||
        filters.startDateMinimum) && (
        <button
          type="button"
          onClick={() => {
            setMetroSelection([]);
            onChange({});
          }}
          className="text-sm font-medium text-primary"
        >
          {t("filters.reset")}
        </button>
      )}

      <MetroFilterModal
        open={metroOpen}
        city={city}
        value={metroSelection}
        userLocation={userLocation}
        onCityChange={handleCityChange}
        onChange={applyMetro}
        onClose={() => setMetroOpen(false)}
      />
    </div>
  );
}
