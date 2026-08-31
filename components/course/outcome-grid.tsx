import type { ComponentType } from "react";
import {
  CodeBracketIcon,
  GaugeIcon,
  type IconProps,
  LayersIcon,
  PuzzleIcon,
  RocketIcon,
  ShieldIcon,
  SparklesIcon,
  StarIcon,
  WorkflowIcon,
} from "@/components/icons";

const OUTCOME_ICONS: Record<string, ComponentType<IconProps>> = {
  layers: LayersIcon,
  workflow: WorkflowIcon,
  gauge: GaugeIcon,
  rocket: RocketIcon,
  code: CodeBracketIcon,
  puzzle: PuzzleIcon,
  shield: ShieldIcon,
  sparkles: SparklesIcon,
};

export interface Outcome {
  _key: string;
  icon: string | null;
  title: string | null;
  description: string | null;
}

export function OutcomeGrid({ outcomes }: { outcomes: Outcome[] }) {
  if (outcomes.length === 0) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-surface p-6 sm:p-8">
      <h2 className="font-display text-heading-1 font-bold text-neutral-900">
        What you&apos;ll learn
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {outcomes.map((outcome) => {
          const Icon = (outcome.icon && OUTCOME_ICONS[outcome.icon]) || StarIcon;
          return (
            <div
              key={outcome._key}
              className="rounded-md border border-neutral-200 p-5"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-100 text-primary-500">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-heading-3 font-bold text-neutral-900">
                {outcome.title}
              </h3>
              <p className="mt-1 text-body text-neutral-500">
                {outcome.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
