import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocument, listDocuments } from "@/modules/legal";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listDocuments().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = getDocument((await params).slug);
  return { title: doc?.title };
}

export default async function LegalDocumentPage({ params }: Props) {
  const doc = getDocument((await params).slug);
  if (!doc) notFound();

  return (
    <div className="container">
      <article>
        <h1>{doc.title}</h1>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
