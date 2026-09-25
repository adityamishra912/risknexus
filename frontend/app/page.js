'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function MarketingHomePage() {
  const pageRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const taglineRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline
        .fromTo(logoRef.current, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.55 })
        .fromTo(titleRef.current, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.2')
        .fromTo(taglineRef.current, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.55 }, '-=0.28')
        .fromTo(buttonRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45 }, '-=0.2');
    }, pageRef);

    return () => context.revert();
  }, []);

  return (
    <main ref={pageRef} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070A] px-6 text-slate-100 selection:bg-cyan-400 selection:text-black">
      <Link href="/" aria-label="RiskNexus home" className="absolute left-6 top-6 z-10 sm:left-10 sm:top-8">
        <Image
          ref={logoRef}
          src="/risknexus_logo_v2.svg"
          alt="RiskNexus"
          width={300}
          height={300}
          priority
          className="h-10 w-auto"
        />
      </Link>

      <section className="flex w-full max-w-3xl flex-col items-center text-center">
        <h1 ref={titleRef} className="font-mono text-5xl font-extrabold text-white">
          RISKNEXUS
        </h1>
        <p ref={taglineRef} className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
          Quantify Cyber Risk. Prioritize What Matters.
        </p>
        <Link
          ref={buttonRef}
          href="/data-sources"
          className="mt-9 inline-flex items-center gap-3 rounded-md border border-cyan-300/50 bg-cyan-400 px-6 py-3 text-sm font-bold text-[#061014] shadow-[0_0_32px_rgba(34,211,238,0.18)] transition-colors hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        >
          Go To Dashboard
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}