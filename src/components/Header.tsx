export default function Header() {
  return (
    <header className="mb-6 flex shrink-0 items-center animate-fade-up">
      <div className="flex items-center gap-3">
        <span
          className="brand-mark relative h-9 w-9 shrink-0 rounded-md bg-linear-to-br from-[#ff7a1a] via-primary to-[#9a3a00]"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            BadEdits
          </h1>
          <p className="text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
            Utils · BFX Packager
          </p>
        </div>
      </div>
    </header>
  );
}
