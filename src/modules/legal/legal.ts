import { cancellationAndReturns } from "./documents/iptal-ve-iade-kosullari";
import { kvkkNotice } from "./documents/kvkk-aydinlatma-metni";
import { distanceSalesContract } from "./documents/mesafeli-satis-sozlesmesi";
import { preInformationForm } from "./documents/on-bilgilendirme-formu";
import { privacyAndCookies } from "./documents/gizlilik-ve-cerez-politikasi";
import type { LegalDocument } from "./types";

const documents: readonly LegalDocument[] = [
  distanceSalesContract,
  preInformationForm,
  cancellationAndReturns,
  kvkkNotice,
  privacyAndCookies,
];

export function listDocuments(): readonly LegalDocument[] {
  return documents;
}

export function getDocument(slug: string): LegalDocument | undefined {
  return documents.find((d) => d.slug === slug);
}

export function getCurrentVersion(slug: string): string | undefined {
  return getDocument(slug)?.version;
}

/** Slug -> current version; stored on an Order when the Customer accepts the contracts. */
export function getCurrentVersions(): Record<string, string> {
  return Object.fromEntries(documents.map((d) => [d.slug, d.version]));
}
