/** Decorative skyline of bars bleeding off the bottom of the home page. */
export function DecorativeBars() {
  const heights = [90, 150, 210, 130, 60, 40, 120, 190, 240, 170, 100, 150];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1024 240"
      preserveAspectRatio="none"
      className="h-40 w-full sm:h-52"
    >
      <defs>
        <linearGradient id="bar-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary-300)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-primary-300)" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {heights.map((h, i) => {
        const barWidth = 1024 / heights.length;
        const gap = barWidth * 0.22;
        const x = i * barWidth + gap / 2;
        const w = barWidth - gap;
        return (
          <rect
            key={i}
            x={x}
            y={240 - h}
            width={w}
            height={h}
            rx={6}
            fill="url(#bar-fade)"
          />
        );
      })}
    </svg>
  );
}
