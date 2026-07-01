import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { Callout } from "@/components/site/mdx/callout";
import { Figure } from "@/components/site/mdx/figure";
import { PaperCard } from "@/components/site/mdx/paper-card";

/**
 * Admin-authored MDX only. MDX compiles to executable code, so this renderer
 * must never receive user-generated content (comments render as plain text).
 */

const components = {
  Callout,
  Figure,
  PaperCard,
};

const options = {
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
      <MDXRemote source={source} components={components} options={options} />
    </div>
  );
}
