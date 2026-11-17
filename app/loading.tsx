export default function Loading() {
  return (
    <section
      data-page-loading="true"
      aria-busy="true"
      aria-label="Loading page"
      className="mx-auto w-full max-w-6xl animate-pulse space-y-6 py-4 motion-reduce:animate-none"
    >
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-primary/10" />
        <div className="h-8 w-60 rounded-xl bg-primary/10" />
        <div className="h-4 w-72 max-w-full rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-border bg-card" />
      <p role="status" className="sr-only">
        Loading your page…
      </p>
    </section>
  );
}
