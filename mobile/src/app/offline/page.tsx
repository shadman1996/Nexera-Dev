"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050811] text-white select-none">
      <div className="backdrop-blur-xl bg-[#08090d]/80 border border-[#1b1c24]/50 rounded-2xl p-10 max-w-md w-full mx-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#3279F9]/20 border border-[#3279F9]/40 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#3279F9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.071M12 12h.01" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-white mb-2">You&apos;re Offline</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Nexera OS can&apos;t reach the backend right now. Check that your local server is
            running and reconnect.
          </p>
        </div>

        <div className="text-xs text-slate-600 font-mono bg-[#050811] rounded-lg px-4 py-3 border border-[#1b1c24]/60 text-left space-y-1">
          <p className="text-slate-400">Start the backend:</p>
          <p className="text-[#3279F9]">python -m backend.main</p>
          <p className="text-slate-400 mt-1">Start the PWA:</p>
          <p className="text-[#3279F9]">cd mobile &amp;&amp; npm run dev</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-2.5 rounded-lg bg-[#3279F9] hover:bg-[#2563eb] text-white text-sm font-medium transition-colors"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
