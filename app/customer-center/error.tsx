"use client";

export default function ModuleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#F4F7FC] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">NANOFIX Module Degraded</p>
        <h1 className="mt-3 text-2xl font-bold">This module is temporarily unavailable.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Only this module has been isolated. Other NANOFIX website, admin, customer and engineer modules can continue operating.
        </p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{error.message || "Unknown module error"}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Retry module
        </button>
      </section>
    </main>
  );
}
