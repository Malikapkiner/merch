import { isKnownDistrict, isKnownProvince } from "../address";
import type { Address, BillingInfo, CheckoutField, CheckoutInput } from "./types";

export type CheckoutDetails = {
  email: string;
  phone: string;
  shippingAddress: Address;
  billing: BillingInfo;
};

/** Generous upper bound for any single free-text field. */
const MAX_TEXT_LENGTH = 300;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "0532 123 45 67", "+90 532…" or "532…" -> "+905321234567"; null when not a Turkish number. */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+?90(?=\d{10}$)/, "").replace(/^0/, "");
  return /^[2-5]\d{9}$/.test(digits) ? `+90${digits}` : null;
}

function isFilled(value: string): boolean {
  return value.length > 0 && value.length <= MAX_TEXT_LENGTH;
}

/**
 * Trims and normalises the Customer's details and lists every invalid field,
 * in form order. Il and ilçe must come from the Address module lists; a tax
 * number, when given, is a VKN (10 digits) or TCKN (11 digits).
 */
export function validateCheckoutDetails(
  input: CheckoutInput,
): { ok: true; details: CheckoutDetails } | { ok: false; fields: CheckoutField[] } {
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  const shippingAddress: Address = {
    fullName: input.shippingAddress.fullName.trim(),
    province: input.shippingAddress.province.trim(),
    district: input.shippingAddress.district.trim(),
    neighbourhood: input.shippingAddress.neighbourhood.trim(),
    addressLine: input.shippingAddress.addressLine.trim(),
  };
  const taxNumber = input.billing.taxNumber?.replace(/\s/g, "") || null;
  const billing: BillingInfo = {
    // An empty invoice name means the invoice goes to the recipient.
    name: input.billing.name.trim() || shippingAddress.fullName,
    province: input.billing.province.trim(),
    district: input.billing.district.trim(),
    neighbourhood: input.billing.neighbourhood.trim(),
    addressLine: input.billing.addressLine.trim(),
    taxNumber,
  };

  const checks: [CheckoutField, boolean][] = [
    ["email", email.length <= MAX_TEXT_LENGTH && EMAIL_PATTERN.test(email)],
    ["phone", phone !== null],
    ["fullName", isFilled(shippingAddress.fullName)],
    ["province", isKnownProvince(shippingAddress.province)],
    ["district", isKnownDistrict(shippingAddress.province, shippingAddress.district)],
    ["neighbourhood", isFilled(shippingAddress.neighbourhood)],
    ["addressLine", isFilled(shippingAddress.addressLine)],
    ["billingName", isFilled(billing.name)],
    ["billingProvince", isKnownProvince(billing.province)],
    ["billingDistrict", isKnownDistrict(billing.province, billing.district)],
    ["billingNeighbourhood", isFilled(billing.neighbourhood)],
    ["billingAddressLine", isFilled(billing.addressLine)],
    ["taxNumber", taxNumber === null || /^\d{10,11}$/.test(taxNumber)],
  ];
  const fields = checks.filter(([, valid]) => !valid).map(([field]) => field);
  if (fields.length > 0) return { ok: false, fields };
  return { ok: true, details: { email, phone: phone as string, shippingAddress, billing } };
}
