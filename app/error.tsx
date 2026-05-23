"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-SG">
      <body>
        <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
          <h1>NANOFIX page module temporarily unavailable</h1>
          <p>One website module failed to render, but the rest of the system remains isolated and available.</p>
          <p style={{ color: "#64748b" }}>Reference: {error.digest || error.message}</p>
          <button onClick={() => reset()} style={{ padding: "10px 16px", borderRadius: 10, background: "#f97316", color: "white", border: 0 }}>
            Reload this module
          </button>
        </main>
      </body>
    </html>
  );
}
