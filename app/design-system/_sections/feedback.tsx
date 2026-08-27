import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusIndicator, type StatusKind } from "@/components/ui/status";
import { Label, Section } from "./section";

const badges = [
  { caption: "Video", tone: "video", text: "Video" },
  { caption: "Lesson", tone: "lesson", text: "Lesson" },
  { caption: "Popular", tone: "popular", text: "Popular" },
] as const;

const statuses: StatusKind[] = [
  "in-progress",
  "completed",
  "now-playing",
  "locked",
];

export function BadgesSection() {
  return (
    <Section number="09" title="Badges / Tags">
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
        {badges.map((badge) => (
          <div key={badge.caption}>
            <Label>{badge.caption}</Label>
            <Badge tone={badge.tone} className="mt-3">
              {badge.text}
            </Badge>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function StatusSection() {
  return (
    <Section number="10" title="Status / Indicators">
      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-4">
        {statuses.map((status) => (
          <StatusIndicator key={status} status={status} />
        ))}
      </div>
    </Section>
  );
}

export function ProgressSection() {
  return (
    <Section number="11" title="Progress Bar">
      <ProgressBar value={35} className="mt-9" />
    </Section>
  );
}
