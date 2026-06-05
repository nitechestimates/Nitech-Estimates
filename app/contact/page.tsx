export default function Contact() {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-10 max-w-lg w-full text-center animate-fade-in-up">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Contact Us</h1>
        <p className="text-slate-600 mb-6">
          Have questions, suggestions, or need support? Reach out to us and
          we&apos;ll get back to you as soon as possible.
        </p>
        <a
          href="mailto:nitechestimates@gmail.com"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
        >
          ✉️ nitechestimates@gmail.com
        </a>
      </div>
    </div>
  );
}