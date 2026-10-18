import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Sepet",
  description: "Sepetinizdeki ürünler, kargo ücreti ve toplam tutar.",
};

export default function CartPage() {
  return (
    <div className="container section">
      <h1 className="heading-section">Sepet</h1>
      <CartView />
    </div>
  );
}
