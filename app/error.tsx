"use client";

export default function ErrorPantalla({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">Something went wrong</h1>
      <p className="hyto-sub">Try again. If it keeps happening, sign in once more.</p>
      <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
