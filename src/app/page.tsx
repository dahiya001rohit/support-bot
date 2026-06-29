"use client";

import Link from "next/link";
import { MessageSquare, BookOpen, Ticket, Code2, Check } from "lucide-react";
import { motion, Variants } from "framer-motion";

const features = [
  {
    icon: BookOpen,
    title: "RAG-powered answers",
    desc: "Answers draw exclusively from your uploaded documents — no hallucinations.",
    metric: "100%",
    metricLabel: "accurate replies",
  },
  {
    icon: Ticket,
    title: "Intelligent escalation",
    desc: "Complex or frustrated queries automatically become tickets with assigned priority levels.",
    metric: "65%",
    metricLabel: "human triage saved",
    metricColor: "text-green-500",
  },
  {
    icon: Code2,
    title: "One-line embed",
    desc: "Drop a single script tag on any page. No framework required, no build step.",
    metric: "<2m",
    metricLabel: "setup time",
    metricColor: "text-orange-500",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0e0f11] text-[#e6e6e9] selection:bg-[#5e6ad2]/30 overflow-hidden">
      {/* Nav */}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto w-[85%] max-w-6xl h-16 flex items-center px-7 rounded-full transition-all duration-200 border border-white/[0.07] bg-[#161616]/75 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-md"
        >
          <nav className="w-full flex items-center justify-between relative">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5e6ad2]">
                <MessageSquare className="size-3.5 text-white" />
              </div>
              <span className="font-serif italic text-white no-underline text-[18px] tracking-[-0.02em]">SupportAI</span>
            </div>
            
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-7">
              <Link href="#" className="font-inter text-[#999] no-underline whitespace-nowrap transition-colors duration-150 hover:text-white text-[14px] tracking-[-0.01em]">Use cases</Link>
              <Link href="#" className="font-inter text-[#999] no-underline whitespace-nowrap transition-colors duration-150 hover:text-white text-[14px] tracking-[-0.01em]">Pricing</Link>
              <Link href="#" className="font-inter text-[#999] no-underline whitespace-nowrap transition-colors duration-150 hover:text-white text-[14px] tracking-[-0.01em]">Enterprise</Link>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href="/login"
                className="font-inter text-[#999] no-underline rounded-full transition-colors duration-150 hover:text-white text-[12px] tracking-[-0.01em] px-[14px] py-[5px]"
              >
                Log in
              </Link>
              <motion.div whileTap={{ scale: 0.93 }} transition={{ duration: 0.15 }}>
                <Link
                  href="/register"
                  className="font-inter text-white no-underline bg-[#5e6ad2] rounded-full inline-block whitespace-nowrap text-[12px] font-medium tracking-[-0.01em] px-[16px] py-[6px] hover:bg-[#6e7ae2] transition-colors"
                >
                  Get started
                </Link>
              </motion.div>
            </div>
          </nav>
        </motion.header>
      </div>

      <main className="flex flex-col items-center">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden pt-24 pb-32">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(94,106,210,0.15) 0%, transparent 70%)",
            }}
          />
          
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex flex-col items-center"
            >
              <motion.div variants={fadeUp} className="mb-6 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-xs font-medium text-[#5e6ad2] backdrop-blur-md">
                Introducing SupportAI 2.0
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="font-display text-6xl leading-[1.1] tracking-tight text-[#e6e6e9] md:text-8xl">
                AI customer support, <br />
                <span className="text-[#5e6ad2] italic">trained on your docs.</span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-[#8a8f98]">
                Upload your knowledge base, embed one script tag, and let AI resolve tickets — escalating to humans only when it matters.
              </motion.p>
              
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="rounded-full bg-[#5e6ad2] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-10px_rgba(94,106,210,0.5)] transition-all hover:bg-[#6e7ae2] hover:shadow-[0_0_60px_-15px_rgba(94,106,210,0.7)]"
                >
                  Start free
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-white/[0.1] bg-white/[0.02] px-8 py-3.5 text-sm font-semibold text-[#e6e6e9] backdrop-blur-md transition-all hover:bg-white/[0.05]"
                >
                  View dashboard
                </Link>
              </motion.div>
            </motion.div>

            {/* Mock Dashboard / Chat */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-20 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1b1e]/80 shadow-2xl backdrop-blur-xl text-left"
            >
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-black/20 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-white/[0.03] border border-white/[0.05] text-[11px] text-[#8a8f98]">
                  support-ai.com/widget
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#5e6ad2] px-4 py-2.5 text-sm text-white shadow-sm">
                      What&apos;s your refund policy?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/[0.06] bg-[#232428] px-4 py-2.5 text-sm text-[#e6e6e9] shadow-sm">
                      We offer a 30-day money-back guarantee on all plans. Email <span className="text-[#818cf8] hover:underline cursor-pointer">support@example.com</span> with your order number.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#5e6ad2] px-4 py-2.5 text-sm text-white shadow-sm">
                      Does that apply to annual plans too?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/[0.06] bg-[#232428] px-4 py-2.5 text-sm text-[#e6e6e9] shadow-sm">
                      Yes — the 30-day guarantee applies to all billing cycles including annual subscriptions.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feature Highlights (Inspired by the 3 metric cards) */}
        <section className="w-full border-t border-white/[0.04] bg-[#0A0A0A] py-32">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center"
            >
              <motion.div variants={fadeUp} className="mb-4 inline-flex rounded-full bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-[#8a8f98]">
                Capabilities
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-display text-4xl text-[#e6e6e9] md:text-5xl">
                Cold inquiry to resolved ticket. <br />
                <span className="italic text-[#8a8f98]">Zero human effort.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-[#8a8f98]">
                Our agent reads your documentation in seconds, providing instantly accurate answers to your users 24/7.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="mt-24 relative"
            >
              <div className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-8">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    variants={fadeUp}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Title & Body */}
                    <h3 className={`mb-4 font-display text-xl ${feature.metricColor || 'text-[#5e6ad2]'}`}>{feature.title}</h3>
                    <p className="mb-12 max-w-[240px] text-[13px] leading-relaxed text-[#8a8f98]">{feature.desc}</p>
                    
                    {/* Metric */}
                    <div className="mt-auto w-full border-t border-white/[0.04] pt-8">
                      <div className={`mb-3 font-display text-5xl ${feature.metricColor || 'text-[#5e6ad2]'}`}>
                        {feature.metric}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a8f98]">
                        {feature.metricLabel}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Explainability Section */}
        <section className="w-full py-32">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center"
            >
              <div className="space-y-8">
                <motion.div variants={fadeUp} className="inline-flex rounded-full bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-[#5e6ad2]">
                  Trust & Safety
                </motion.div>
                <motion.h2 variants={fadeUp} className="font-display text-4xl text-[#e6e6e9] md:text-5xl leading-tight">
                  Not a black box. <br />
                  Every answer is <span className="italic">sourced.</span>
                </motion.h2>
                <motion.p variants={fadeUp} className="text-[#8a8f98] text-lg leading-relaxed">
                  Unlike generic LLMs, SupportAI strictly grounds its responses in the documents you provide. It automatically cites the specific sections it used to construct an answer.
                </motion.p>
                
                <motion.ul variants={staggerContainer} className="space-y-4">
                  {[
                    "Eliminates AI hallucinations",
                    "Maintains your brand voice",
                    "Provides citation links to users"
                  ].map((item, i) => (
                    <motion.li key={i} variants={fadeUp} className="flex items-center gap-3 text-[#e6e6e9]">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5e6ad2]/20 text-[#5e6ad2]">
                        <Check className="size-3.5" />
                      </div>
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
              
              <motion.div variants={fadeUp} className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#5e6ad2]/20 to-transparent rounded-3xl blur-3xl opacity-50" />
                <div className="relative rounded-3xl border border-white/[0.08] bg-[#1a1b1e]/90 p-8 shadow-2xl backdrop-blur-sm">
                  <div className="mb-6 border-b border-white/[0.06] pb-4">
                    <p className="text-sm font-medium text-[#e6e6e9]">Source Document: <span className="text-[#8a8f98]">Billing Policy.pdf</span></p>
                  </div>
                  <p className="text-sm leading-relaxed text-[#8a8f98] font-mono bg-black/30 p-4 rounded-xl border border-white/[0.04]">
                    ... refunds will be processed within 5-7 business days. <span className="bg-[#5e6ad2]/30 text-white rounded px-1">All annual subscriptions are eligible for a full refund within the first 30 days of purchase.</span> Please contact billing...
                  </p>
                  
                  <div className="mt-6 flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 px-4 py-3 text-sm text-[#e6e6e9] shadow-sm">
                      Yes, the 30-day guarantee applies to annual subscriptions.
                      <div className="mt-2 text-[11px] text-[#5e6ad2] flex items-center gap-1 cursor-pointer hover:underline">
                        <BookOpen className="size-3" /> View source
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="w-full border-t border-white/[0.04] bg-[#0A0A0A] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(94,106,210,0.1)_0%,transparent_50%)]" />
          <div className="relative mx-auto max-w-4xl px-6 py-32 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="flex flex-col items-center"
            >
              <motion.div variants={fadeUp} className="mb-4 inline-flex rounded-full bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-[#8a8f98]">
                Get Started
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-display text-5xl text-[#e6e6e9] md:text-7xl tracking-tight mb-8">
                Stop triaging <span className="italic text-[#8a8f98]">manually.</span>
              </motion.h2>
              <motion.div variants={fadeUp} className="flex gap-4">
                <Link
                  href="/register"
                  className="rounded-full bg-[#5e6ad2] px-8 py-4 text-base font-semibold text-white shadow-[0_0_30px_-5px_rgba(94,106,210,0.4)] transition-all hover:bg-[#6e7ae2] hover:scale-105"
                >
                  Start free trial
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-white/[0.06] bg-[#0A0A0A] py-16 px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-[1fr_auto_auto_auto] md:gap-24">
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#5e6ad2]">
                  <MessageSquare className="size-3 text-white" />
                </div>
                <span className="font-serif italic text-[18px] tracking-[-0.02em] text-[#FFFFFF]">SupportAI</span>
              </div>
              <p className="mb-6 max-w-[220px] text-[12px] leading-relaxed tracking-[-0.01em] text-[#444]">
                AI customer support, trained on your docs. Resolves and escalates automatically.
              </p>
              <div className="text-[11px] tracking-[-0.01em] text-[#333]">
                © 2026 SupportAI
              </div>
            </div>

            <div>
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.06em] text-[#444]">Product</div>
              <div className="flex flex-col gap-2.5">
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">How it works</Link>
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Capabilities</Link>
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Dashboard</Link>
              </div>
            </div>

            <div>
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.06em] text-[#444]">Company</div>
              <div className="flex flex-col gap-2.5">
                <Link href="/login" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Sign in</Link>
                <Link href="/register" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Sign up</Link>
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Settings</Link>
              </div>
            </div>

            <div>
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.06em] text-[#444]">Legal</div>
              <div className="flex flex-col gap-2.5">
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Privacy</Link>
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Terms</Link>
                <Link href="#" className="text-[13px] tracking-[-0.01em] text-[#888] transition-colors hover:text-[#FFF]">Security</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
