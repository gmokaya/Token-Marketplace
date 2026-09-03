import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Link } from "wouter";

export default function ApiDocs() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F4EF] text-[#073B35]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#073B35]/65 transition-colors hover:text-[#073B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFC4A]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <Link href="/" aria-label="TokenHarvest home">
          <span className="tokenharvest-wordmark text-3xl text-[#073B35] md:text-4xl">TokenHarvest</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-20 md:px-10 md:py-28">
        <section className="w-full max-w-2xl text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#808A87]/20 text-[#073B35]">
            <FileText size={26} strokeWidth={1.6} />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#073B35]">
            API Documentation
          </p>
          <h1 className="text-6xl font-medium leading-[0.95] tracking-[-0.06em] md:text-8xl">
            Sharing soon.
          </h1>
          <p className="mx-auto mt-8 max-w-lg text-base leading-8 text-[#073B35]/65 md:text-lg">
            We are preparing the TokenHarvest API documentation for partners and builders.
            Check back soon for access.
          </p>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#DFFC4A] px-5 py-3 text-sm font-semibold text-[#073B35] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFC4A] focus-visible:ring-offset-2"
          >
            Back to home
            <ArrowRight size={15} />
          </Link>
        </section>
      </main>

      <footer className="bg-[#111111] px-6 py-8 text-white md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs uppercase tracking-[0.14em] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>TokenHarvest API</span>
          <Link href="/" className="transition-colors hover:text-white">
            Return to TokenHarvest
          </Link>
        </div>
      </footer>
    </div>
  );
}