import { NextResponse } from "next/server";
import { compileMDX } from "next-mdx-remote/rsc";

import {
  CalloutPreview,
  PaperCardPreview,
} from "@/components/admin/preview-components";
import { Figure } from "@/components/site/mdx/figure";
import { requireAdmin } from "@/lib/actions/guard";
import { mdxOptions } from "@/lib/mdx";

/**
 * Draft MDX preview for the admin editors. Compiles with the same
 * remark/rehype pipeline as the public pages and returns static HTML the
 * editor injects into a `.prose-article` container. Admin-authored MDX
 * only — same trust model as lib/mdx.tsx.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { source?: unknown };
  if (typeof body.source !== "string") {
    return NextResponse.json({ error: "source required" }, { status: 400 });
  }

  try {
    // Preview-safe components only: renderToStaticMarkup cannot invoke
    // client components, which rules out anything importing lucide-react
    const { content } = await compileMDX({
      source: body.source,
      components: {
        Callout: CalloutPreview,
        Figure,
        PaperCard: PaperCardPreview,
      },
      options: mdxOptions,
    });
    // Dynamic import: react-dom/server is aliased away in the RSC graph
    const { renderToStaticMarkup } = await import("react-dom/server");
    return NextResponse.json({ html: renderToStaticMarkup(content) });
  } catch (error) {
    // Compile errors are expected while typing — surface them in the pane
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid MDX" },
      { status: 422 },
    );
  }
}
