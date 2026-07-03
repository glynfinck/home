import { cn } from "@/lib/utils";

/** Blinking block caret, CSS-only so it stays server-safe. */
export function Caret({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "animate-caret-blink motion-reduce:animate-none ml-[0.15ch] inline-block h-[1.1em] w-[0.55ch] translate-y-[0.18em] bg-brand",
        className,
      )}
    />
  );
}
