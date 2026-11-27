import { TerminalLoader } from "@/components/site/terminal-loader";

export default function AboutLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <TerminalLoader command="whoami" />
    </section>
  );
}
