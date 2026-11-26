"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MdxField } from "@/components/admin/mdx-field";
import { ResumeUploadField } from "@/components/admin/upload-fields";
import { saveSettings } from "@/lib/actions/admin";
import type {
  ProfileFact,
  ProfileSettings,
  SeoSettings,
  SocialLink,
  TimelineEntry,
} from "@/lib/settings";

/**
 * The About page's facts and timeline are edited as plain lines, one entry
 * each, with a separator between the two parts. Lines without one are ignored
 * rather than rejected, so a half-typed line never blocks a save.
 */
function toLines<T>(items: T[], format: (item: T) => string): string {
  return items.map(format).join("\n");
}
function fromLines<T>(
  text: string,
  separator: string,
  build: (left: string, right: string) => T,
): T[] {
  return text
    .split("\n")
    .map((line) => {
      const at = line.indexOf(separator);
      if (at < 1) return null;
      const left = line.slice(0, at).trim();
      const right = line.slice(at + separator.length).trim();
      return left && right ? build(left, right) : null;
    })
    .filter((item): item is T => item !== null);
}

function useSave() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function save(input: Parameters<typeof saveSettings>[0]) {
    startTransition(async () => {
      const result = await saveSettings(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved — live immediately");
      router.refresh();
    });
  }

  return { pending, save };
}

export function ProfileSettingsForm({ initial }: { initial: ProfileSettings }) {
  const [values, setValues] = React.useState(initial);
  const [factsText, setFactsText] = React.useState(() =>
    toLines(initial.facts, (f) => `${f.key}: ${f.value}`),
  );
  const [timelineText, setTimelineText] = React.useState(() =>
    toLines(initial.timeline, (t) => `${t.when} | ${t.text}`),
  );
  const { pending, save } = useSave();

  type TextKey = {
    [K in keyof ProfileSettings]: ProfileSettings[K] extends string ? K : never;
  }[keyof ProfileSettings];

  function set(key: TextKey, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function saveProfile() {
    save({
      key: "profile",
      value: {
        ...values,
        facts: fromLines<ProfileFact>(factsText, ":", (key, value) => ({
          key,
          value,
        })),
        timeline: fromLines<TimelineEntry>(timelineText, "|", (when, text) => ({
          when,
          text,
        })),
      },
    });
  }

  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-medium tracking-tight">Profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Drives the hero, about page, and footer.
      </p>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>
            Time zone{" "}
            <span className="font-normal text-muted-foreground">
              (IANA name, for the footer clock; empty hides it)
            </span>
          </Label>
          <Input
            value={values.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            placeholder="Europe/London"
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label>Headline</Label>
          <Input
            value={values.headline}
            onChange={(e) => set("headline", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Bio</Label>
          <Textarea
            value={values.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            placeholder="Short hero subtext (plain text)."
          />
        </div>
        <MdxField
          id="about"
          label={
            <>
              About{" "}
              <span className="font-normal text-muted-foreground">
                (MDX — rendered on the About page; falls back to Bio if empty)
              </span>
            </>
          }
          value={values.about}
          onChange={(about) => set("about", about)}
          rows={12}
          placeholder={"## Optional heading\n\nYour story in MDX…"}
        />
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="facts">
              About facts{" "}
              <span className="font-normal text-muted-foreground">
                (one per line, <span className="font-mono">key: value</span>)
              </span>
            </Label>
            <Textarea
              id="facts"
              value={factsText}
              onChange={(e) => setFactsText(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder={"role: Systems developer\nbased: London, England"}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timeline">
              About timeline{" "}
              <span className="font-normal text-muted-foreground">
                (newest first, <span className="font-mono">when | what</span>)
              </span>
            </Label>
            <Textarea
              id="timeline"
              value={timelineText}
              onChange={(e) => setTimelineText(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder={"2022 to now | Connor Clark & Lunn, London"}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Resume{" "}
            <span className="font-normal text-muted-foreground">
              (PDF — the About page shows a download button when set)
            </span>
          </Label>
          <ResumeUploadField
            value={values.resume_url}
            onChange={(url) => set("resume_url", url)}
          />
        </div>
        <div>
          <Button size="sm" disabled={pending} onClick={saveProfile}>
            {pending ? <Spinner /> : null} Save profile
          </Button>
        </div>
      </div>
    </section>
  );
}

const ICON_OPTIONS = ["github", "linkedin", "x", "mail", "none"] as const;

export function SocialLinksForm({ initial }: { initial: SocialLink[] }) {
  const [links, setLinks] = React.useState<SocialLink[]>(initial);
  const { pending, save } = useSave();

  function update(index: number, patch: Partial<SocialLink>) {
    setLinks((all) =>
      all.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );
  }

  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-medium tracking-tight">Social links</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Shown in the footer, hero, and about page.
      </p>
      <div className="mt-4 space-y-3">
        {links.map((link, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <GripVertical className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
            <Input
              value={link.label}
              placeholder="Label"
              className="w-full sm:w-32"
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Input
              value={link.url}
              placeholder="https://…"
              className="w-full sm:flex-1"
              onChange={(e) => update(i, { url: e.target.value })}
            />
            <Select
              value={link.icon ?? "none"}
              onValueChange={(icon) =>
                update(i, { icon: icon === "none" ? undefined : icon })
              }
            >
              <SelectTrigger className="flex-1 sm:w-32 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    {icon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Remove link"
              className="shrink-0"
              onClick={() => setLinks((all) => all.filter((_, j) => j !== i))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLinks((all) => [
                ...all,
                { label: "", url: "", icon: undefined },
              ])
            }
          >
            <Plus className="size-4" /> Add link
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              save({
                key: "social_links",
                value: links.filter((l) => l.label && l.url),
              })
            }
          >
            {pending ? <Spinner /> : null} Save links
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SeoSettingsForm({ initial }: { initial: SeoSettings }) {
  const [values, setValues] = React.useState(initial);
  const { pending, save } = useSave();

  function set<K extends keyof SeoSettings>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-medium tracking-tight">SEO</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Default metadata for every page.
      </p>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label>Default title</Label>
            <Input
              value={values.default_title}
              onChange={(e) => set("default_title", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Title template</Label>
            <Input
              value={values.title_template}
              onChange={(e) => set("title_template", e.target.value)}
              placeholder="%s · glyn.dev"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <Textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid gap-2">
          <Label>Canonical URL</Label>
          <Input
            value={values.url}
            onChange={(e) => set("url", e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => save({ key: "seo", value: values })}
          >
            {pending ? <Spinner /> : null} Save SEO
          </Button>
        </div>
      </div>
    </section>
  );
}
