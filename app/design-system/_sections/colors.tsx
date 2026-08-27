import { Section } from "./section";

const primary = [
  { name: "Primary 500", hex: "#F97316", className: "bg-primary-500" },
  { name: "Primary 400", hex: "#FB923C", className: "bg-primary-400" },
  { name: "Primary 300", hex: "#FDBA74", className: "bg-primary-300" },
  { name: "Primary 200", hex: "#FED7AA", className: "bg-primary-200" },
  { name: "Primary 100", hex: "#FFEEE5", className: "bg-primary-100" },
];

const neutral = [
  { name: "Neutral 900", hex: "#0F172A", className: "bg-neutral-900" },
  { name: "Neutral 700", hex: "#334155", className: "bg-neutral-700" },
  { name: "Neutral 500", hex: "#64748B", className: "bg-neutral-500" },
  { name: "Neutral 300", hex: "#CBD5E1", className: "bg-neutral-300" },
  { name: "Neutral 200", hex: "#E2E8F0", className: "bg-neutral-200" },
  { name: "Neutral 100", hex: "#F1F5F9", className: "bg-neutral-100" },
  { name: "Neutral 50", hex: "#FAFAFC", className: "bg-neutral-50" },
  { name: "White", hex: "#FFFFFF", className: "bg-white" },
];

function Swatch({
  name,
  hex,
  className,
}: {
  name: string;
  hex: string;
  className: string;
}) {
  return (
    <div>
      <div
        className={`h-14 rounded-sm border border-neutral-200 ${className}`}
      />
      <p className="mt-2 text-body text-neutral-700">{name}</p>
      <p className="text-body text-neutral-500">{hex}</p>
    </div>
  );
}

export function ColorsSection() {
  return (
    <Section number="01" title="Colors">
      <p className="mt-6 text-body-lg text-neutral-900">Primary</p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {primary.map((color) => (
          <Swatch key={color.name} {...color} />
        ))}
      </div>

      <p className="mt-7 text-body-lg text-neutral-900">Neutral</p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">
        {neutral.map((color) => (
          <Swatch key={color.name} {...color} />
        ))}
      </div>
    </Section>
  );
}
