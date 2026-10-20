import type { Metadata } from "next";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "Sipariş sorgula", robots: { index: false } };

export default function OrderLookupPage() {
  return (
    <div className="container section narrow">
      <h1 className="heading-section">Sipariş sorgula</h1>
      <p className="lead">Üye olmadan verdiğiniz siparişin durumunu sipariş numaranız ve e-postanızla görebilirsiniz.</p>
      <LookupForm />
    </div>
  );
}
