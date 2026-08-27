import { Section } from "./section";

const scale = [
  {
    style: "Display 1",
    font: "Playfair Display",
    size: "48 / 56",
    weight: "Bold",
    use: "Page titles",
    sample: "font-display font-bold",
  },
  {
    style: "Display 2",
    font: "Playfair Display",
    size: "36 / 44",
    weight: "Bold",
    use: "Section titles",
    sample: "font-display font-bold",
  },
  {
    style: "Heading 1",
    font: "Inter",
    size: "28 / 36",
    weight: "Semi Bold",
    use: "Card titles",
    sample: "",
  },
  {
    style: "Heading 2",
    font: "Inter",
    size: "22 / 30",
    weight: "Semi Bold",
    use: "Sub section",
    sample: "",
  },
  {
    style: "Heading 3",
    font: "Inter",
    size: "18 / 26",
    weight: "Medium",
    use: "Small titles",
    sample: "",
  },
  {
    style: "Body Large",
    font: "Inter",
    size: "16 / 24",
    weight: "Regular",
    use: "Body copy",
    sample: "",
  },
  {
    style: "Body",
    font: "Inter",
    size: "14 / 20",
    weight: "Regular",
    use: "Supporting text",
    sample: "",
  },
  {
    style: "Small",
    font: "Inter",
    size: "12 / 16",
    weight: "Regular",
    use: "Captions, meta",
    sample: "",
  },
];

export function TypographySection() {
  return (
    <Section number="02" title="Typography">
      <div className="mt-8 space-y-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="font-display text-[56px] leading-none font-bold text-neutral-900">
            Ag
          </span>
          <div>
            <p className="text-heading-2 font-semibold text-neutral-900">
              Playfair Display
            </p>
            <p className="mt-1 text-body text-neutral-500">
              Elegant <span className="px-1 text-primary-500">•</span> Readable{" "}
              <span className="px-1 text-primary-500">•</span> Timeless
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="text-[56px] leading-none font-bold text-neutral-900">
            Ag
          </span>
          <div>
            <p className="text-heading-2 font-semibold text-neutral-900">
              Inter
            </p>
            <p className="mt-1 text-body text-neutral-500">
              Clean <span className="px-1 text-primary-500">•</span> Modern{" "}
              <span className="px-1 text-primary-500">•</span> Highly legible
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function TypeScaleSection() {
  return (
    <Section number="03" title="Type Scale">
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-200">
              {["Style", "Font", "Size / Line Height", "Weight", "Use"].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="pb-3 text-body font-normal text-neutral-500"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {scale.map((row) => (
              <tr key={row.style}>
                <td className="py-2 pr-4">
                  <span
                    className={`text-body-lg font-semibold text-neutral-900 ${row.sample}`}
                  >
                    {row.style}
                  </span>
                </td>
                <td className="py-2 pr-4 text-body text-neutral-500">
                  {row.font}
                </td>
                <td className="py-2 pr-4 text-body text-neutral-500">
                  {row.size}
                </td>
                <td className="py-2 pr-4 text-body text-neutral-500">
                  {row.weight}
                </td>
                <td className="py-2 text-body text-neutral-500">{row.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
