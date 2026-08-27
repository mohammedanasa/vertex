import {
  BarChartFilledIcon,
  BarChartIcon,
  BellFilledIcon,
  BellIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  ChevronRightFilledIcon,
  ChevronRightIcon,
  ClockFilledIcon,
  ClockIcon,
  DocumentFilledIcon,
  DocumentIcon,
  ExternalLinkIcon,
  PlayCircleFilledIcon,
  PlayCircleIcon,
  SearchFilledIcon,
  SearchIcon,
  UserFilledIcon,
  UserIcon,
  type IconProps,
} from "@/components/icons";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label, Section, SpecList } from "./section";

const outlineIcons = [
  BellIcon,
  SearchIcon,
  PlayCircleIcon,
  DocumentIcon,
  BookmarkIcon,
  BarChartIcon,
  ClockIcon,
  UserIcon,
  ChevronRightIcon,
];

const filledIcons = [
  BellFilledIcon,
  SearchFilledIcon,
  PlayCircleFilledIcon,
  DocumentFilledIcon,
  BookmarkFilledIcon,
  BarChartFilledIcon,
  ClockFilledIcon,
  UserFilledIcon,
  ChevronRightFilledIcon,
];

function IconRow({
  icons,
}: {
  icons: ((props: IconProps) => React.ReactElement)[];
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-4 text-neutral-900">
      {icons.map((Icon, index) => (
        <Icon key={index} className="size-6" />
      ))}
    </div>
  );
}

export function IconsSection() {
  return (
    <Section number="06" title="Icons">
      <div className="mt-6">
        <Label>Outline Style</Label>
        <IconRow icons={outlineIcons} />
      </div>

      <div className="mt-7">
        <Label>Filled Style</Label>
        <IconRow icons={filledIcons} />
      </div>

      <div className="mt-8">
        <SpecList
          title="Icon Specs"
          items={[
            "24x24px grid",
            "2px stroke width (outline)",
            "Rounded line caps",
            "Consistent optical balance",
          ]}
        />
      </div>
    </Section>
  );
}

const buttonColumns: { variant: ButtonVariant; heading: string }[] = [
  { variant: "primary", heading: "Primary" },
  { variant: "secondary", heading: "Secondary" },
  { variant: "tertiary", heading: "Tertiary" },
  { variant: "text", heading: "Text" },
];

const buttonRows = [
  { state: "Default", forceHover: false, disabled: false },
  { state: "Hover", forceHover: true, disabled: false },
  { state: "Disabled", forceHover: false, disabled: true },
];

function ButtonDemo({
  variant,
  forceHover,
  disabled,
}: {
  variant: ButtonVariant;
  forceHover: boolean;
  disabled: boolean;
}) {
  switch (variant) {
    case "primary":
      return (
        <Button size="md" forceHover={forceHover} disabled={disabled}>
          Get Started
        </Button>
      );
    case "secondary":
      return (
        <Button
          variant="secondary"
          size="md"
          forceHover={forceHover}
          disabled={disabled}
        >
          Explore Courses
        </Button>
      );
    case "tertiary":
      return (
        <Button
          variant="tertiary"
          size="md"
          forceHover={forceHover}
          disabled={disabled}
        >
          View Lesson
          <ExternalLinkIcon className="size-4" />
        </Button>
      );
    case "text":
      return (
        <Button
          variant="text"
          size="md"
          forceHover={forceHover}
          disabled={disabled}
        >
          Watch Video
          <PlayCircleIcon className="size-5" />
        </Button>
      );
  }
}

export function ButtonsSection() {
  return (
    <Section number="07" title="Buttons">
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-[520px] border-separate border-spacing-x-3 border-spacing-y-3">
          <thead>
            <tr>
              <th className="w-16" />
              {buttonColumns.map((column) => (
                <th
                  key={column.variant}
                  scope="col"
                  className="text-left text-body font-normal text-neutral-500"
                >
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buttonRows.map((row) => (
              <tr key={row.state}>
                <th
                  scope="row"
                  className="text-left text-body font-semibold text-neutral-900"
                >
                  {row.state}
                </th>
                {buttonColumns.map((column) => (
                  <td key={column.variant}>
                    <ButtonDemo
                      variant={column.variant}
                      forceHover={row.forceHover}
                      disabled={row.disabled}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <SpecList
          title="Button Specs"
          items={[
            "Height: 44px (default)",
            "Padding: 0 16px (lg), 0 12px (md)",
            "Radius: 12px",
            "Font: Inter Medium (14–16px)",
          ]}
        />
      </div>
    </Section>
  );
}

export function InputsSection() {
  return (
    <Section number="08" title="Inputs">
      <div className="mt-6">
        <Label>Search / Text Input</Label>
        <SearchInput
          className="mt-3"
          placeholder="Search anything..."
          aria-label="Search anything"
        />
      </div>

      <div className="mt-7">
        <Label>Select</Label>
        <Select className="mt-3" defaultValue="relevant" aria-label="Sort by">
          <option value="relevant">Most Relevant</option>
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
        </Select>
      </div>

      <div className="mt-8">
        <SpecList
          title="Field Specs"
          items={[
            "Height: 44px",
            "Radius: 12px",
            "Border: 1px solid #E2E8F0",
            "Padding: 0 16px",
            "Focus: Border color #FB923C",
          ]}
        />
      </div>
    </Section>
  );
}
