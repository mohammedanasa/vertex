import type { Metadata } from "next";
import { LogoMark } from "@/components/ui/logo";
import { CardsSection } from "./_sections/cards";
import { ColorsSection } from "./_sections/colors";
import { ButtonsSection, IconsSection, InputsSection } from "./_sections/controls";
import {
  BadgesSection,
  ProgressSection,
  StatusSection,
} from "./_sections/feedback";
import { RadiusShadowsSection, SpacingSection } from "./_sections/foundations";
import { NavigationSection, PrinciplesSection } from "./_sections/navigation";
import { TypeScaleSection, TypographySection } from "./_sections/typography";

export const metadata: Metadata = {
  title: "Design System · Vertex",
  description:
    "A unified design language for Vertex learning platform. Clean, modern and focused on clarity, consistency and intuitive learning experiences.",
};

function TitleCard() {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-neutral-200 bg-surface p-6">
      <span className="inline-flex items-center gap-2.5">
        <LogoMark className="size-8" />
        <span className="text-heading-1 font-bold tracking-tight text-neutral-900">
          Vertex
        </span>
      </span>
      <h1 className="mt-6 font-display text-display-1 font-bold text-neutral-900">
        Design System
      </h1>
      <p className="mt-4 max-w-xs text-body-lg text-neutral-700">
        A unified design language for Vertex learning platform. Clean, modern and
        focused on clarity, consistency and intuitive learning experiences.
      </p>
      <p className="mt-auto pt-8 text-small font-semibold tracking-[0.14em] text-neutral-500 uppercase">
        Version 1.0 <span className="px-2 text-primary-500">•</span> May 2025
      </p>
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2.3fr]">
        <TitleCard />
        <ColorsSection />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <TypographySection />
        <TypeScaleSection />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <SpacingSection />
        <RadiusShadowsSection />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_2.05fr_1fr]">
        <IconsSection />
        <ButtonsSection />
        <InputsSection />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.88fr_1.25fr_1.17fr]">
        <BadgesSection />
        <StatusSection />
        <ProgressSection />
      </div>

      <CardsSection />
      <NavigationSection />
      <PrinciplesSection />
    </main>
  );
}
