import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">Page not found</h1>
      <p className="hyto-sub">That page is not in Hyto.</p>
      <Link href="/" className="hyto-btn mt-6 max-w-xs">
        Home
      </Link>
    </main>
  );
}
