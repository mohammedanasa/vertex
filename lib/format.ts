/** Formats a duration in seconds as "1h 12m" or "5m" / "45s" for short clips. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Formats a raw count as a compact display value, e.g. 2140 -> "2.1k". */
export function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${count}`;
}

/** A Portable Text block, narrowed to only what plain-text extraction needs. */
type TextBlock = {
  _type: string;
  style?: string | null;
  children?: Array<{ text?: string | null } | null> | null;
};

/**
 * Flattens Portable Text to plain text. Used for the lesson sub-title line,
 * which shows the lesson's opening paragraph — the schema has no separate
 * summary field, and inventing one would mean showing content the author
 * never wrote (AGENTS.md §7: say only what the data returns).
 */
export function portableTextToPlainText(
  blocks: readonly unknown[] | null | undefined,
  { maxBlocks }: { maxBlocks?: number } = {},
): string {
  if (!blocks) return "";

  const textBlocks = blocks.filter(
    (block): block is TextBlock =>
      typeof block === "object" &&
      block !== null &&
      (block as TextBlock)._type === "block",
  );

  return (maxBlocks ? textBlocks.slice(0, maxBlocks) : textBlocks)
    .map((block) =>
      (block.children ?? [])
        .map((child) => child?.text ?? "")
        .join("")
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
}
