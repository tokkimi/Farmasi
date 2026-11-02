/** Official Farmasi wordmark used consistently across the demo. */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/farmasi-logo.png" alt="Farmasi" className={`farmasi-logo ${className ?? ""}`} />
  );
}
