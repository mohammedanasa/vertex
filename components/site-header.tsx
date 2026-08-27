import { BellIcon, UserIcon } from "@/components/icons";
import { Logo } from "@/components/ui/logo";
import { NavLink } from "@/components/ui/nav-link";

/** Site chrome shared by every page: logo, primary nav, notifications, account. */
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-8 sm:flex">
            <NavLink href="/courses">Courses</NavLink>
            <NavLink href="/my-learning">My Learning</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-10 items-center justify-center rounded-full text-neutral-900 transition-colors hover:bg-neutral-100"
          >
            <BellIcon className="size-5" />
          </button>
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-500"
          >
            <UserIcon className="size-5" />
          </span>
        </div>
      </div>
    </header>
  );
}
