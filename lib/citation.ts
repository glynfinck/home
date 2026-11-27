/**
 * A BibTeX entry for a paper on this site.
 *
 * `@misc` with a URL is the conventional form for a self-published write-up:
 * there is no journal or publisher to name, and the URL is where it lives.
 */
export function bibtex({
  author,
  title,
  slug,
  publishedAt,
  siteUrl,
}: {
  /** Display name, "Given Family". */
  author: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  siteUrl: string;
}): string {
  const names = author.trim().split(/\s+/);
  const family = names.at(-1) ?? "";
  const given = names.slice(0, -1).join(" ");
  const year = publishedAt
    ? String(new Date(publishedAt).getUTCFullYear())
    : "";

  // finck2026oupairs: family name, year, first two words of the slug.
  const key = [
    family.toLowerCase().replace(/[^a-z]/g, ""),
    year,
    ...slug.split("-").slice(0, 2),
  ].join("");

  const fields: [string, string][] = [
    ["author", given ? `${family}, ${given}` : family],
    ["title", escapeBibtex(title)],
    ...(year ? ([["year", year]] as [string, string][]) : []),
    ["url", `${siteUrl.replace(/\/+$/, "")}/research/${slug}`],
  ];
  const width = Math.max(...fields.map(([name]) => name.length));

  return [
    `@misc{${key},`,
    ...fields.map(
      ([name, value], i) =>
        `  ${name.padEnd(width)} = {${value}}${i < fields.length - 1 ? "," : ""}`,
    ),
    "}",
  ].join("\n");
}

/** BibTeX treats these as syntax inside a field value. */
function escapeBibtex(value: string): string {
  return value.replace(/([&%$#_])/g, "\\$1");
}
