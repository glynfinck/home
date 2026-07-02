import { Caret } from "@/components/site/caret";

/** Terminal-flavored loading line: `$ <command>` with a blinking caret. */
export function TerminalLoader({ command = "load" }: { command?: string }) {
  return (
    <p
      role="status"
      aria-label="Loading"
      className="font-mono text-sm text-muted-foreground"
    >
      <span className="text-brand">$</span> {command}
      <Caret className="ml-[0.5ch] bg-muted-foreground/60" />
    </p>
  );
}
