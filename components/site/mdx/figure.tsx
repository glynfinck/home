/* eslint-disable @next/next/no-img-element */

/**
 * MDX image block. Full width by default; `width` caps it and centers the
 * figure — a bare number is pixels, otherwise any CSS width:
 * `<Figure src="…" alt="…" width={480} />`, `width="480"`, or `width="60%"`.
 */
export function Figure({
  src,
  alt,
  caption,
  width,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number | string;
}) {
  return (
    <figure
      className="my-8"
      style={
        width !== undefined
          ? {
              maxWidth:
                typeof width === "number" || /^\d+$/.test(width)
                  ? `${width}px`
                  : width,
              marginLeft: "auto",
              marginRight: "auto",
            }
          : undefined
      }
    >
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-border"
      />
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
