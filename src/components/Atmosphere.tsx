export default function Atmosphere() {
  return (
    <>
      <div
        className="noise pointer-events-none fixed inset-0 z-0 opacity-[0.045]"
        aria-hidden="true"
      />
      <div className="wash pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
    </>
  );
}
