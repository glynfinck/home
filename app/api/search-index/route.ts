import { NextResponse } from "next/server";

import { getSearchIndex } from "@/lib/data/search";

/**
 * Search index for the command palette.
 *
 * Served from a route handler and fetched on the palette's *first open* rather
 * than passed down from the layout. Threading it through the layout would put
 * the whole index in the RSC payload of every page on the site, to serve a
 * feature most visits never use.
 *
 * Public data only (published rows), so it is cacheable at the edge.
 */
export async function GET() {
  const items = await getSearchIndex();

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
