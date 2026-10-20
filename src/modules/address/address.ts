import { DISTRICTS_BY_PROVINCE } from "./districts";

const byProvince = new Map(
  Object.entries(DISTRICTS_BY_PROVINCE).map(([province, names]) => [province, names.split(", ")]),
);

const provinces = [...byProvince.keys()].sort((a, b) => a.localeCompare(b, "tr"));

/** Every il, in Turkish alphabetical order; the source of the checkout il list. */
export function listProvinces(): string[] {
  return [...provinces];
}

/** The ilçe of an il, or none for an unknown il. */
export function listDistricts(province: string): string[] {
  return [...(byProvince.get(province) ?? [])];
}

/** True when the il is one of the 81 provinces. */
export function isKnownProvince(province: string): boolean {
  return byProvince.has(province);
}

/** True when the ilçe belongs to the il; addresses are only accepted from these lists. */
export function isKnownDistrict(province: string, district: string): boolean {
  return byProvince.get(province)?.includes(district) ?? false;
}

/** "0532 123 45 67", "+90 532…" or "532…" -> "+905321234567"; null when not a Turkish number. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+?90(?=\d{10}$)/, "").replace(/^0/, "");
  return /^[2-5]\d{9}$/.test(digits) ? `+90${digits}` : null;
}
