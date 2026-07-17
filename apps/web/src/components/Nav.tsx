import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        Property Digital Twin
      </Link>
      <span className="spacer" />
      <Link href="/">Map</Link>
      <Link href="/copilot">Copilot</Link>
      <Link href="/admin/review">Review</Link>
      <Link href="/admin/metrics">Ops</Link>
    </nav>
  );
}
