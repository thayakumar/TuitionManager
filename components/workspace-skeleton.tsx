export function WorkspaceSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading workspace content"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2.5">
          <div className="skeleton-block h-3 w-28" />
          <div className="skeleton-block h-8 w-52" />
          <div className="skeleton-block h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton-block h-10 w-32 rounded-lg" />
          <div className="skeleton-block h-10 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 shadow-2xs"
          >
            <div className="skeleton-block h-3.5 w-24" />
            <div className="skeleton-block mt-3.5 h-8 w-20" />
            <div className="skeleton-block mt-2.5 h-3 w-32 max-w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs lg:col-span-2">
          <div className="skeleton-block h-5 w-40" />
          <div className="mt-5 space-y-4">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-4">
                <div className="skeleton-block size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton-block h-4 w-44 max-w-full" />
                  <div className="skeleton-block h-3 w-64 max-w-full" />
                </div>
                <div className="skeleton-block h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
          <div className="skeleton-block h-5 w-32" />
          <div className="mt-5 space-y-3">
            <div className="skeleton-block h-36 w-full rounded-xl" />
            <div className="skeleton-block h-4 w-3/4" />
            <div className="skeleton-block h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
