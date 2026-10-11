import { describe, expect, it } from "vitest";
import { getCurrentVersion, getCurrentVersions, getDocument, listDocuments } from "./index";

describe("Legal", () => {
  it("lists the five mandatory documents", () => {
    expect(listDocuments().map((d) => d.slug)).toEqual([
      "mesafeli-satis-sozlesmesi",
      "on-bilgilendirme-formu",
      "iptal-ve-iade-kosullari",
      "kvkk-aydinlatma-metni",
      "gizlilik-ve-cerez-politikasi",
    ]);
  });

  it("returns the current version of a document", () => {
    expect(getCurrentVersion("mesafeli-satis-sozlesmesi")).toBe("1");
  });

  it("returns all current versions keyed by slug, for recording contract acceptance", () => {
    const versions = getCurrentVersions();

    expect(Object.keys(versions)).toHaveLength(5);
    expect(versions["on-bilgilendirme-formu"]).toBe("1");
  });

  it("returns a document with title and body, or undefined for an unknown slug", () => {
    const doc = getDocument("kvkk-aydinlatma-metni");

    expect(doc?.title).toBe("KVKK Aydınlatma Metni");
    expect(doc?.sections.length).toBeGreaterThan(0);
    expect(getDocument("yok")).toBeUndefined();
  });
});
