import {
  AccessibilityIcon,
  EyeIcon,
  GridIcon,
  TargetIcon,
  type IconProps,
} from "@/components/icons";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Logo } from "@/components/ui/logo";
import { NavLink } from "@/components/ui/nav-link";
import { Pagination } from "@/components/ui/pagination";
import { Label, SectionHeading } from "./section";

const principles: {
  title: string;
  description: string;
  Icon: (props: IconProps) => React.ReactElement;
}[] = [
  {
    title: "Clarity First",
    description: "Every element should communicate clearly.",
    Icon: EyeIcon,
  },
  {
    title: "Consistency",
    description: "Use components and patterns consistently across the platform.",
    Icon: GridIcon,
  },
  {
    title: "Focus & Calm",
    description: "Remove noise and help learners focus on what matters.",
    Icon: TargetIcon,
  },
  {
    title: "Accessible",
    description: "Design with accessibility and inclusivity in mind.",
    Icon: AccessibilityIcon,
  },
];

export function NavigationSection() {
  return (
    <section className="min-w-0 rounded-lg border border-neutral-200 bg-surface">
      <div className="grid grid-cols-1 divide-y divide-neutral-200 lg:grid-cols-[1fr_1.2fr_1.08fr] lg:divide-x lg:divide-y-0">
        <div className="p-6">
          <SectionHeading number="13" title="Navigation" />
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Logo />
            <NavLink href="/design-system" active>
              Courses
            </NavLink>
            <NavLink href="/design-system">My Learning</NavLink>
          </div>
        </div>

        <div className="p-6">
          <Label>Breadcrumbs</Label>
          <Breadcrumbs
            className="mt-5"
            items={[
              { label: "All Courses", href: "/design-system" },
              { label: "Next.js for Production", href: "/design-system" },
              { label: "Data Fetching & Caching" },
            ]}
          />
        </div>

        <div className="p-6">
          <Label>Pagination</Label>
          <Pagination
            className="mt-4"
            page={1}
            totalPages={8}
            hrefFor={(target) => `/design-system?page=${target}`}
          />
        </div>
      </div>
    </section>
  );
}

export function PrinciplesSection() {
  return (
    <section className="min-w-0 rounded-lg border border-neutral-200 bg-surface p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
        <SectionHeading number="14" title="Principles" className="lg:pt-1" />

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          {principles.map(({ title, description, Icon }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="size-6 shrink-0 text-neutral-900" />
              <div>
                <p className="text-body font-semibold text-neutral-900">
                  {title}
                </p>
                <p className="mt-1 text-body text-neutral-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
