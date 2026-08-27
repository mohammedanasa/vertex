import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Vertex adds named font sizes (`text-display-1`, `text-body`, …). Without
 * registering them, tailwind-merge reads them as text *colors* and drops them
 * when a real color class follows.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-1",
            "display-2",
            "heading-1",
            "heading-2",
            "heading-3",
            "body-lg",
            "body",
            "small",
          ],
        },
      ],
    },
  },
});

/** Join class names, letting later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
