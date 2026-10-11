export type LegalDocument = {
  slug: string;
  title: string;
  /** Bump when the text changes; Orders record the accepted version. */
  version: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
};

export const placeholderSection = {
  heading: "Yer tutucu metin",
  paragraphs: ["Bu belgenin geçerli metni yakında yayınlanacaktır."],
} as const;
