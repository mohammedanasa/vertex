import { Section } from "./section";

const spacing = [
  { px: 4, rem: "0.25rem" },
  { px: 8, rem: "0.5rem" },
  { px: 12, rem: "0.75rem" },
  { px: 16, rem: "1rem" },
  { px: 24, rem: "1.5rem" },
  { px: 32, rem: "2rem" },
  { px: 40, rem: "2.5rem" },
  { px: 48, rem: "3rem" },
  { px: 64, rem: "4rem" },
];

const radii = [
  { label: "4px", name: "(xs)", className: "rounded-xs" },
  { label: "8px", name: "(sm)", className: "rounded-sm" },
  { label: "12px", name: "(md)", className: "rounded-md" },
  { label: "16px", name: "(lg)", className: "rounded-lg" },
  { label: "24px", name: "(xl)", className: "rounded-xl" },
  { label: "Full", name: "(circle)", className: "rounded-full" },
];

const shadows = [
  {
    name: "Sm",
    offset: "0 1px 2px 0",
    color: "rgba(15, 23, 42, 0.05)",
    className: "shadow-sm",
  },
  {
    name: "Md",
    offset: "0 4px 12px -2px",
    color: "rgba(15, 23, 42, 0.08)",
    className: "shadow-md",
  },
  {
    name: "Lg",
    offset: "0 12px 24px -4px",
    color: "rgba(15, 23, 42, 0.10)",
    className: "shadow-lg",
  },
  {
    name: "Xl",
    offset: "0 20px 40px -8px",
    color: "rgba(15, 23, 42, 0.12)",
    className: "shadow-xl",
  },
];

export function SpacingSection() {
  return (
    <Section number="04" title="Spacing System">
      <p className="mt-6 text-body-lg text-neutral-900">Base unit: 4px</p>

      <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-6">
        {spacing.map((step) => (
          <div key={step.px} className="flex flex-col items-center gap-3">
            <div
              className="rounded-xs bg-primary-200"
              style={{ width: step.px, height: step.px }}
            />
            <div className="text-center">
              <p className="text-body text-neutral-900">{step.px}</p>
              <p className="text-small text-neutral-500">({step.rem})</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function RadiusShadowsSection() {
  return (
    <Section number="05" title="Radius & Shadows">
      <p className="mt-6 text-body-lg text-neutral-900">Radius</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-5">
        {radii.map((radius) => (
          <div key={radius.label} className="flex flex-col items-center gap-3">
            <div
              className={`size-12 border border-neutral-200 bg-surface ${radius.className}`}
            />
            <div className="text-center">
              <p className="text-body text-neutral-900">{radius.label}</p>
              <p className="text-small text-neutral-500">{radius.name}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-body-lg text-neutral-900">Shadows</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {shadows.map((shadow) => (
          <div
            key={shadow.name}
            className={`rounded-sm bg-surface p-3 ${shadow.className}`}
          >
            <p className="text-body-lg font-semibold text-neutral-900">
              {shadow.name}
            </p>
            <p className="mt-2 text-small text-neutral-500">{shadow.offset}</p>
            <p className="text-small text-neutral-500">{shadow.color}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
