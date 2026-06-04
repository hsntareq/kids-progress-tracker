import Link from "next/link";

export default function Home() {
  return (
    <div className="ui-app-bg enter-rise flex min-h-screen items-center justify-center px-4">
      <main className="ui-panel w-full max-w-2xl rounded-3xl p-6 md:p-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-bold">Family Quest MVP</p>
        <h1 className="ui-title mt-4 text-4xl font-bold text-slate-900 md:text-5xl">Kids Progress Tracker</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700 md:text-lg">
          Welcome to the family quest! Set up your household, assign tasks, and track rewards.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            className="ui-button-primary ui-focus px-8 py-3 text-center"
            href="/login"
          >
            Start Setup / Login
          </Link>
        </div>
      </main>
    </div>
  );
}
