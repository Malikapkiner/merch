"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/member-session";
import { getOrders } from "@/lib/orders";
import type { CartItem } from "@/modules/cart";
import type { CheckoutField, CheckoutInput, PlaceBankTransferOrderResult, PlaceOrderResult } from "@/modules/orders";

export type CheckoutState = { error?: string; fields?: CheckoutField[] } | undefined;

function textField(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

/** The cart lines the form posted as JSON; anything malformed is dropped. */
function cartItems(formData: FormData): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(textField(formData, "items"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CartItem => typeof item === "object" && item !== null)
      .map((item) => ({ variantId: Number(item.variantId), quantity: Number(item.quantity) }));
  } catch {
    return [];
  }
}

/** Absolute URL for the payment provider to send the Customer back to. */
async function callbackUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${host}/odeme/sonuc`;
}

/** The Customer's IP as the reverse proxy reports it; the payment provider uses it for fraud checks. */
async function customerIp(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0].trim() || headerList.get("x-real-ip") || null;
}

export async function placeOrderAction(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const shippingAddress = {
    fullName: textField(formData, "fullName"),
    province: textField(formData, "province"),
    district: textField(formData, "district"),
    neighbourhood: textField(formData, "neighbourhood"),
    addressLine: textField(formData, "addressLine"),
  };
  const billingSameAsShipping = formData.get("billingSameAsShipping") !== null;
  const billingAddress = billingSameAsShipping
    ? shippingAddress
    : {
        province: textField(formData, "billingProvince"),
        district: textField(formData, "billingDistrict"),
        neighbourhood: textField(formData, "billingNeighbourhood"),
        addressLine: textField(formData, "billingAddressLine"),
      };

  // The Member comes from the session cookie, never from the form.
  const member = await getMember();
  const checkout: CheckoutInput = {
      items: cartItems(formData),
      memberId: member?.id,
      email: textField(formData, "email"),
      phone: textField(formData, "phone"),
      shippingAddress,
      billing: {
        name: textField(formData, "billingName"),
        province: billingAddress.province,
        district: billingAddress.district,
        neighbourhood: billingAddress.neighbourhood,
        addressLine: billingAddress.addressLine,
        taxNumber: textField(formData, "taxNumber") || null,
      },
      acceptedContracts: formData.get("acceptedContracts") !== null,
  };

  let result: PlaceOrderResult | PlaceBankTransferOrderResult;
  if (textField(formData, "paymentMethod") === "bank_transfer") {
    result = await getOrders().placeBankTransferOrder(checkout);
    if (result.ok) redirect(`/siparis/onay/${result.accessToken}?yeni=1`);
  } else {
    result = await getOrders().placeOrder(checkout, { callbackUrl: await callbackUrl(), customerIp: await customerIp() });
    if (result.ok) redirect(result.paymentUrl);
  }
  switch (result.reason) {
    case "contracts-not-accepted":
      return { error: "Ödemeye geçmek için Mesafeli Satış Sözleşmesi'ni ve Ön Bilgilendirme Formu'nu onaylayın." };
    case "invalid-details":
      return { error: "Lütfen işaretli alanları kontrol edin.", fields: result.fields };
    case "empty-cart":
      return { error: "Sepetiniz boş." };
    case "cart-changed":
      return { error: "Sepetinizdeki bazı ürünlerin stoğu değişti. Lütfen sepetinizi kontrol edin." };
  }
}
