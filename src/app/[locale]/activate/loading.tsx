export default function ActivateLoading() {
  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#09090B] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,0.14),transparent_24%)]" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-6%] h-72 w-72 rounded-full bg-[rgba(139,92,246,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute top-[22%] right-[-8%] h-64 w-64 rounded-full bg-[rgba(139,92,246,0.06)] blur-3xl" />

      <header className="relative z-10 border-b border-white/8 bg-[rgba(9,9,11,0.72)] backdrop-blur-[18px]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-5">
          <div className="h-5 w-28 rounded-full bg-white/10" />
          <div className="h-10 w-24 rounded-full bg-white/8" />
        </div>
      </header>

      <div className="relative mx-auto grid min-h-[calc(100vh-77px)] w-full max-w-[1280px] place-items-center px-6 py-8 lg:px-8">
        <section className="grid w-full gap-8 overflow-hidden rounded-[2.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(17,17,20,0.96))] p-8 shadow-[0_36px_140px_-60px_rgba(139,92,246,0.55)] lg:grid-cols-[minmax(0,0.95fr)_420px]">
          <div className="space-y-5">
            <div className="h-9 w-32 rounded-full bg-white/8" />
            <div className="space-y-3">
              <div className="h-12 w-full max-w-[420px] rounded-2xl bg-white/10" />
              <div className="h-12 w-full max-w-[360px] rounded-2xl bg-white/6" />
            </div>
            <div className="h-14 w-full max-w-[260px] rounded-2xl bg-white/8" />
          </div>

          <div className="rounded-[2.25rem] border border-white/10 bg-black/24 p-6 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="h-4 w-24 rounded-full bg-white/8" />
              <div className="h-5 w-full max-w-[260px] rounded-full bg-white/6" />
              <div className="h-14 w-full rounded-2xl bg-white/10" />
              <div className="h-12 w-full rounded-2xl bg-white/12" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
