/**
 * One labelled row of chips. Topics and technologies sit in separate rows
 * ("topics", "stack") with the same label width, so the chips line up.
 */
export function TagRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-5 w-12 shrink-0 items-center font-mono text-[11px] leading-none text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
