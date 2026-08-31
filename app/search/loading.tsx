import { SiteHeader } from "@/components/site-header";

/**
 * Shown while the search runs. A search involves a live model call, so this is
 * on screen for a noticeable moment — it mirrors the result layout so the page
 * does not jump when results arrive.
 */
export default function SearchLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-6 py-12">
          <div className="flex animate-pulse flex-col items-center">
            <div className="h-6 w-32 rounded-xs bg-neutral-100" />
            <div className="mt-4 h-10 w-80 max-w-full rounded-md bg-neutral-100" />
            <div className="mt-3 h-5 w-56 rounded-xs bg-neutral-100" />
            <div className="mt-6 h-11 w-full max-w-xl rounded-md bg-neutral-100" />
          </div>

          <div className="mt-10 flex animate-pulse flex-col gap-3">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-surface p-4 sm:flex-row"
              >
                <div className="aspect-video w-full shrink-0 rounded-md bg-neutral-100 sm:w-64" />
                <div className="flex flex-1 flex-col gap-3 py-1">
                  <div className="h-4 w-40 rounded-xs bg-neutral-100" />
                  <div className="h-6 w-3/4 rounded-xs bg-neutral-100" />
                  <div className="h-4 w-full rounded-xs bg-neutral-100" />
                  <div className="h-4 w-1/2 rounded-xs bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
