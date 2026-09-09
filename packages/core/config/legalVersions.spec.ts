import { DATA_CONSENT_BODY } from "../legal/dataConsent";
import { PERSONAL_DATA_POLICY_BODY } from "../legal/personalDataPolicy";
import { PRIVACY_POLICY_BODY } from "../legal/privacyPolicy";
import { TERMS_BODY } from "../legal/terms";
import { LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_VERSIONS } from "./legalVersions";
import type { LegalDocumentKind } from "./legalVersions";

const RU_MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isoToHuman(iso: string, months: readonly string[]): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

function headline(body: string): string {
  return body.split("\n")[0];
}

const ACCEPTED_BODIES: Record<LegalDocumentKind, { ru: string; en: string }> = {
  terms: TERMS_BODY,
  privacy: PRIVACY_POLICY_BODY,
  data_consent: DATA_CONSENT_BODY,
};

describe("LEGAL_DOCUMENT_VERSIONS", () => {
  it("lists every accepted document kind exactly once", () => {
    expect(Object.keys(LEGAL_DOCUMENT_VERSIONS).sort()).toEqual(
      [...LEGAL_DOCUMENT_KINDS].sort(),
    );
  });

  it.each(LEGAL_DOCUMENT_KINDS)("%s version is an ISO date", (kind) => {
    expect(LEGAL_DOCUMENT_VERSIONS[kind]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(LEGAL_DOCUMENT_KINDS)(
    "%s version matches the effective date printed at the top of the RU and EN bodies",
    (kind) => {
      const iso = LEGAL_DOCUMENT_VERSIONS[kind];
      const { ru, en } = ACCEPTED_BODIES[kind];
      expect([headline(ru), headline(en)]).toEqual([
        expect.stringContaining(isoToHuman(iso, RU_MONTHS)),
        expect.stringContaining(isoToHuman(iso, EN_MONTHS)),
      ]);
    },
  );

  it("personal data policy carries the same effective date as the consent it underpins", () => {
    const iso = LEGAL_DOCUMENT_VERSIONS.data_consent;
    expect([
      headline(PERSONAL_DATA_POLICY_BODY.ru),
      headline(PERSONAL_DATA_POLICY_BODY.en),
    ]).toEqual([
      expect.stringContaining(isoToHuman(iso, RU_MONTHS)),
      expect.stringContaining(isoToHuman(iso, EN_MONTHS)),
    ]);
  });
});
