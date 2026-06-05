export default function Tutorial() {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-10 max-w-lg w-full text-center animate-fade-in-up">
        <div className="text-5xl mb-4">📖</div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Tutorials</h1>
        <p className="text-slate-600 mb-6">
          Step-by-step guides and video tutorials are being prepared. Check back
          soon to learn how to create estimates, manage rate analysis, and
          generate professional billing reports.
        </p>
        <a
          href="/estimate-builder"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
        >
          ← Back to Estimate Builder
        </a>
      </div>
    </div>
  );
}