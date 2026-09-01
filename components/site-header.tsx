"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { BellIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { NavLink } from "@/components/ui/nav-link";

/** Site chrome shared by every page: logo, primary nav, notifications, account. */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200">
      <Container className="flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-8 sm:flex">
            <NavLink href="/courses" active={pathname.startsWith("/courses")}>
              Courses
            </NavLink>
            <NavLink
              href="/my-learning"
              active={pathname.startsWith("/my-learning")}
            >
              My Learning
            </NavLink>
            {/* Saved holds nothing but per-learner state, so it is offered only
                once there is an account for it to belong to. */}
            <Show when="signed-in">
              <NavLink href="/saved" active={pathname.startsWith("/saved")}>
                Saved
              </NavLink>
            </Show>
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
      </Container>
    </header>
  );
}
