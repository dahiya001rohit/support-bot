import Link from "next/link";
import { MessageSquare, BookOpen, Ticket, Code2 } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "RAG-powered answers",
    desc: "Answers draw exclusively from your uploaded documents — no hallucinations, no off-topic replies.",
  },
  {
    icon: Ticket,
    title: "Intelligent escalation",
    desc: "Complex or frustrated queries automatically become tickets with AI-assigned priority levels.",
  },
  {
    icon: Code2,
    title: "One-line embed",
    desc: "Drop a single script tag on any page. No framework required, no build step.",
  },
];

const steps = [
  { n: "1", label: "Upload docs", detail: "PDF, DOCX, TXT, or Markdown" },
  { n: "2", label: "Embed widget", detail: "One script tag on your site" },
  { n: "3", label: "AI handles support", detail: "Resolves and escalates automatically" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0e0f11] text-[#e6e6e9]" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0e0f11]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#5e6ad2]">
              <MessageSquare className="size-3.5 text-white" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-[#e6e6e9]">SupportAI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3.5 py-1.5 text-sm text-[#8a8f98] transition-colors hover:bg-white/[0.04] hover:text-[#e6e6e9]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[#5e6ad2] px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#6e7ae2]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(94,106,210,0.08) 0%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-24 text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#e6e6e9] md:text-5xl">
            AI customer support,<br className="hidden sm:block" /> trained on your docs.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#8a8f98]">
            Upload your knowledge base, embed one script tag, and let AI resolve tickets — escalating to humans only when it matters.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-md bg-[#5e6ad2] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6e7ae2]"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/[0.08] px-5 py-2.5 text-sm text-[#8a8f98] transition-colors hover:bg-white/[0.04] hover:text-[#e6e6e9]"
            >
              View dashboard
            </Link>
          </div>

          {/* Mock chat */}
          <div className="mx-auto mt-14 max-w-sm overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1b1e] shadow-2xl text-left">
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-[#1a1b1e] px-4 py-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#5e6ad2]">
                <MessageSquare className="size-3 text-white" />
              </div>
              <span className="text-[13px] font-medium text-[#e6e6e9]">Support</span>
              <span className="ml-auto text-[11px] text-[#4ade80]">● Online</span>
            </div>
            <div className="space-y-3 bg-[#0e0f11] p-4">
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-xl rounded-br-sm bg-[#5e6ad2] px-3.5 py-2 text-sm text-white">
                  What&apos;s your refund policy?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[82%] rounded-xl rounded-bl-sm border border-white/[0.06] bg-[#232428] px-3.5 py-2 text-sm text-[#e6e6e9]">
                  We offer a 30-day money-back guarantee on all plans. Email{" "}
                  <span className="text-[#818cf8]">support@example.com</span> with your order number.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-xl rounded-br-sm bg-[#5e6ad2] px-3.5 py-2 text-sm text-white">
                  Does that apply to annual plans too?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[82%] rounded-xl rounded-bl-sm border border-white/[0.06] bg-[#232428] px-3.5 py-2 text-sm text-[#e6e6e9]">
                  Yes — the 30-day guarantee applies to all billing cycles including annual.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="mb-10 text-center text-[11px] font-medium uppercase tracking-widest text-[#8a8f98]">
            What you get
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.06] bg-[#1a1b1e] p-5"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#5e6ad2]/10">
                  <Icon className="size-4 text-[#5e6ad2]" />
                </div>
                <h3 className="mb-1.5 text-sm font-medium text-[#e6e6e9]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#8a8f98]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="mb-12 text-center text-[11px] font-medium uppercase tracking-widest text-[#8a8f98]">
            How it works
          </p>
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-0">
            {steps.map((step, i) => (
              <div key={step.n} className="flex md:flex-row items-center gap-0">
                <div className="flex flex-col items-center text-center md:w-48">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#1a1b1e] text-sm font-semibold text-[#5e6ad2]">
                    {step.n}
                  </div>
                  <p className="text-sm font-medium text-[#e6e6e9]">{step.label}</p>
                  <p className="mt-1 text-xs text-[#8a8f98]">{step.detail}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-6 hidden text-[#8a8f98]/30 md:block text-lg">→</div>
                )}
                {i < steps.length - 1 && (
                  <div className="my-2 text-[#8a8f98]/30 md:hidden text-lg">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#5e6ad2]">
              <MessageSquare className="size-3 text-white" />
            </div>
            <span className="text-sm text-[#8a8f98]">SupportAI</span>
          </div>
          <p className="text-sm text-[#8a8f98]">© 2026 SupportAI · AI support built for speed</p>
          <div className="flex gap-5 text-sm text-[#8a8f98]">
            <Link href="/login" className="transition-colors hover:text-[#e6e6e9]">Log in</Link>
            <Link href="/register" className="transition-colors hover:text-[#e6e6e9]">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
