export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Audio Commitments Streamer</h1>
        <p className="text-sm text-slate-600 mt-1">
          Deterministic conversation-to-commitments engine with timestamped audio citations.
        </p>
      </header>
      <section className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Service Status</h2>
        <p className="text-sm text-emerald-600 font-medium">● Frontend Initialized (Next.js 16 + React 19)</p>
      </section>
    </main>
  );
}
