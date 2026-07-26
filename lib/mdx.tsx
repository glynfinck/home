import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { Callout } from "@/components/site/mdx/callout";
import { Chart } from "@/components/site/mdx/chart";
import { Figure } from "@/components/site/mdx/figure";
import { PaperCard } from "@/components/site/mdx/paper-card";
import { Pre } from "@/components/site/mdx/pre";
import { Sidenote } from "@/components/site/mdx/sidenote";
import { Table } from "@/components/site/mdx/table";

/**
 * Admin-authored MDX only. MDX compiles to executable code, so this renderer
 * must never receive user-generated content (comments render as plain text).
 *
 * Anything added here also needs a server-safe stand-in in
 * `components/admin/preview-components.tsx`, or the admin live preview breaks
 * (`renderToStaticMarkup` cannot render client components).
 */

export const mdxComponents = {
  Callout,
  Chart,
  Figure,
  PaperCard,
  Sidenote,
  Table,
  // Overriding `pre` adds the filename tab and copy button to every fenced
  // block without touching the rehype-pretty-code output.
  pre: Pre,
};

export const mdxOptions = {
  // next-mdx-remote v6 strips JSX expressions ({...}) by default as a
  // sandbox for untrusted content. This pipeline is admin-only (see above),
  // so restore full MDX semantics — numeric props like width={320} included.
  // blockDangerousJS stays on (blocks eval/process/etc.) as defense in depth.
  blockJS: false,
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
      [
        rehypePrettyCode,
        {
          theme: { dark: "github-dark-default", light: "github-light-default" },
          keepBackground: false,
          defaultLang: "text",
        },
      ],
      rehypeKatex,
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
};

export function Mdx({ source }: { source: string }) {
  return (
    <div className="prose-article">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={mdxOptions}
      />
    </div>
  );
}
