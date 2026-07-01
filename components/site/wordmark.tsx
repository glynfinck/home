import Link from "next/link";

export function Wordmark() {
  return (
    <Link
      href="/"
      className="font-mono text-sm font-medium tracking-tight transition-opacity duration-150 hover:opacity-80"
    >
      glyn<span className="text-brand">.dev</span>
    </Link>
  );
}
