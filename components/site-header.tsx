import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { BellIcon } from "@/components/icons";
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
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-600"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="flex h-10 items-center rounded-full bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
              >
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
