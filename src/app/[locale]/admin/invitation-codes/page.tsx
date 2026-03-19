export default async function InvitationCodesAdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          Admin
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          Invitation Code System
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Admin invitation code management UI scaffold. The API layer is ready for code generation,
          stats, toggle, and activation flow integration.
        </p>
      </section>
    </main>
  );
}
