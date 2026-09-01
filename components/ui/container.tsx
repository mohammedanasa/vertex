import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one page width. Every content surface — the header, the page bodies, and
 * the inner row of the sticky bottom bars — goes through this so their left
 * edges line up. Changing the max width here changes it everywhere; nothing
 * should hardcode a page width again.
 *
 * Sticky bars keep their border and shadow full bleed and wrap only their inner
 * row in this.
 */
export function Container({
  as: Component = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component className={cn("mx-auto w-full max-w-7xl px-6", className)}>
      {children}
    </Component>
  );
}
