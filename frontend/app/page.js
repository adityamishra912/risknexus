'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import NetworkGraphBackground from '../components/landing/NetworkGraphBackground';
import Badge from '../components/ui/Badge';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  TrendingDown,
  Lock,
  GitFork,
  PieChart,
  Bot,
  CheckCircle2,
  Server,
  Layers,
  Activity,
  ChevronRight,
  Database,
  Sliders,
  Cpu,
  RefreshCw,
  FileCheck,
  Building2,
  Terminal,
  BarChart2,
  ShieldAlert,
  Cloud,
} from 'lucide-react';


export default function MarketingHomePage() {
  // Headline variant selector
  const headlines = [
    'Know your cyber risk in rupees, not just red flags.',
    'Turn technical vulnerabilities into numbers your CFO can approve.',
    'Continuous financial exposure modeling for enterprise security leaders.',
  ];
  const [headlineIndex, setHeadlineIndex] = useState(0);

  // Live ticking counter in corner
  const [liveEAL, setLiveEAL] = useState(2.4);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEAL((prev) => +(prev + (Math.random() * 0.12 - 0.06)).toFixed(2));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Pipeline stages for Section 3
  const pipelineStages = [
    { name: 'Ingest', desc: 'Qualys, EDR, SIEM feeds', tech: 'Apache Kafka', icon: Database },
    { name: 'Attack Graph', desc: 'Reachability topology', tech: 'Neo4j / GraphX', icon: GitFork },
    { name: 'ML Likelihood', desc: 'EPSS threat probability', tech: 'XGBoost ML', icon: Cpu },
    { name: 'Risk Engine', desc: 'FAIR ontology loss model', tech: 'FAIR Standard', icon: ShieldAlert },
    { name: 'Monte Carlo', desc: '100,000 statistical iterations', tech: 'NumPy / C++', icon: Activity },
    { name: 'Optimizer', desc: 'Knapsack capital solver', tech: 'OR-Tools', icon: PieChart },
    { name: 'Dashboard', desc: 'CFO / CISO financial UI', tech: 'Next.js 16', icon: BarChart2 },
  ];

  const [activePipelineStage, setActivePipelineStage] = useState(0);

  // Core Features mini-vis interactive state
  const [simBefore, setSimBefore] = useState(1.6);
  const [simAfter, setSimAfter] = useState(0.98);
  const [isSimMfaEnabled, setIsSimMfaEnabled] = useState(true);

  // Typing effect state for Copilot mini-vis
  const [copilotText, setCopilotText] = useState('');
  const fullCopilotText = 'Estimated annual loss increased by ₹18L due to CVE-2024-3094 on Payment Gateway API.';

  useEffect(() => {
    let charIdx = 0;
    const interval = setInterval(() => {
      if (charIdx <= fullCopilotText.length) {
        setCopilotText(fullCopilotText.slice(0, charIdx));
        charIdx++;
      } else {
        setTimeout(() => { charIdx = 0; }, 3000);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#05070A] text-slate-100 font-sans min-h-screen overflow-x-hidden relative selection:bg-cyan-500 selection:text-black">
      {/* GLOBAL NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#05070A]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider text-white font-mono">CYBERX</span>
            <span className="text-[10px] text-cyan-400 font-medium tracking-wide uppercase block -mt-1 font-mono">
              Risk Intelligence
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-300 font-medium">
          <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <a href="#sovereignty" className="hover:text-cyan-400 transition-colors">Data Sovereignty</a>
          <a href="#credibility" className="hover:text-cyan-400 transition-colors">Frameworks</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/50 border border-cyan-400/30 transition-all flex items-center gap-1.5">
              <span>Launch Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 py-20 overflow-hidden">
        {/* Animated Network Graph Canvas Background */}
        <NetworkGraphBackground density={70} interactive={true} />

        {/* Floating Live Recalculating EAL Badge (Top Right Corner) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute top-8 right-6 z-20 hidden lg:flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-cyan-500/40 backdrop-blur-md shadow-2xl shadow-cyan-950/40"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono block">Sample EAL — updates every simulation</span>
            <span className="text-base font-extrabold text-cyan-300 font-mono tracking-tight">
              ₹{liveEAL} Cr
            </span>
          </div>
        </motion.div>

        {/* Hero Central Content */}
        <div className="max-w-4xl mx-auto text-center space-y-8 z-10 relative">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-xs font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI-POWERED CONTINUOUS CYBER RISK QUANTIFICATION</span>
          </motion.div>

          {/* Headline with Cycle Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-3"
          >
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              {headlines[headlineIndex]}
            </h1>

            {/* Headline Variant Selector Buttons */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {headlines.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeadlineIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    headlineIndex === idx ? 'bg-cyan-400 w-6' : 'bg-slate-700 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed"
          >
            Ingest security telemetry, map reachability attack graphs, quantify financial risk in rupees, simulate controls, and optimize budget allocation in real time.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/dashboard">
              <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 group">
                <span>Enter Platform Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <a href="#how-it-works">
              <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2">
                <span>See How It Works</span>
              </button>
            </a>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono"
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> FAIR Model Compliant</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> RBI & SEBI Ready</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 100% On-Premise Data Sovereignty</span>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: THE PROBLEM */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/60 relative">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">The Risk Gap</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Traditional Cyber Security is Broken by Severity Labels</h3>
          <p className="text-xs text-slate-400 font-sans">
            Scanners give you 5,000 "High" and "Critical" alerts. CFOs need a single figure: <span className="text-cyan-300 font-mono font-bold">What is our financial loss exposure?</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 30 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/40 transition-all space-y-3"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono">
              ₹17.6 Cr
            </div>
            <h4 className="text-sm font-bold text-white">Average Cost of Financial Data Breach</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Including incident response, business interruption, customer compensation, and regulatory penalties.
            </p>
            <span className="text-[10px] text-slate-500 font-mono block pt-2 border-t border-slate-800">
              Source: IBM Cost of a Data Breach Report
            </span>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 30 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/40 transition-all space-y-3"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono">
              277 Days
            </div>
            <h4 className="text-sm font-bold text-white">Average Time to Contain a Breach</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dwell time across unmonitored lateral attack paths allows threat actors to escalate privileges silently.
            </p>
            <span className="text-[10px] text-slate-500 font-mono block pt-2 border-t border-slate-800">
              Source: Verizon DBIR & Ponemon Institute
            </span>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 30 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/40 transition-all space-y-3"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono">
              78%
            </div>
            <h4 className="text-sm font-bold text-white">CISOs Lacking Financial Models</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Security leaders struggle to justify budget requests without a deterministic return on security investment (ROSI).
            </p>
            <span className="text-[10px] text-slate-500 font-mono block pt-2 border-t border-slate-800">
              Source: Gartner Governance Survey
            </span>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (The Pipeline) */}
      <section id="how-it-works" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/60 relative">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Continuous Pipeline</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">From Raw Scanner Logs to CFO Capital Optimization</h3>
        </div>

        {/* Pipeline Stages Canvas Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {pipelineStages.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = activePipelineStage === idx;

            return (
              <motion.div
                key={idx}
                onClick={() => setActivePipelineStage(idx)}
                whileHover={{ scale: 1.05 }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-36 ${
                  isActive
                    ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center border border-slate-700">
                    {idx + 1}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{stage.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{stage.desc}</p>
                </div>

                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 truncate">
                  {stage.tech}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Expanded Stage Tooltip Detail Card */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 font-mono text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block">{pipelineStages[activePipelineStage].name} Stage Engine</span>
              <span className="text-slate-400 text-[11px] font-sans">
                {pipelineStages[activePipelineStage].desc} — powered by {pipelineStages[activePipelineStage].tech}.
              </span>
            </div>
          </div>
          <Link href="/risk">
            <button className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold shrink-0">
              Inspect Model Engine →
            </button>
          </Link>
        </div>
      </section>

      {/* SECTION 4: CORE FEATURES (Grid with LIVE Embedded Mini-Visualizations) */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/60 relative">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Platform Capabilities</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Live Analytical Engines Built for Risk Decisioning</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1: Attack Path Graph */}
          <motion.div
            whileHover={{ y: -5 }}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">Graph Reachability</span>
              <h4 className="text-sm font-bold text-white">Attack Path Topology Mapping</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Automatically connects internet ingress nodes to crown-jewel databases using graph reachability algorithms.
              </p>
            </div>

            {/* Embedded Live Mini-Vis */}
            <div className="h-28 bg-[#06090F] rounded-xl border border-slate-800 p-3 flex items-center justify-between relative overflow-hidden font-mono text-[10px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">Web FE</div>
              <div className="h-0.5 w-8 bg-cyan-500 animate-pulse"></div>
              <div className="p-2 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">Payment API</div>
              <div className="h-0.5 w-8 bg-amber-500"></div>
              <div className="p-2 rounded bg-red-950 border border-red-800 text-red-400 font-bold">Core DB</div>
            </div>
          </motion.div>

          {/* Feature 2: ML Likelihood Scoring */}
          <motion.div
            whileHover={{ y: -5 }}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">Threat Intel</span>
              <h4 className="text-sm font-bold text-white">ML Likelihood & EPSS Scoring</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Combines CISA KEV feeds, EPSS exploit probability scores, and peer banking threat actor velocity.
              </p>
            </div>

            {/* Embedded Live Mini-Vis */}
            <div className="h-28 bg-[#06090F] rounded-xl border border-slate-800 p-3 flex flex-col justify-center space-y-2 font-mono text-[10px]">
              <div className="flex justify-between text-slate-300">
                <span>CVE-2024-3094 Exploit Probability:</span>
                <span className="text-amber-400 font-bold">88.4% (EPSS)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-gradient-to-r from-cyan-500 to-amber-500 h-full rounded-full w-[88.4%]"></div>
              </div>
              <span className="text-slate-500 text-[9px]">Continuous CISA KEV Stream Active</span>
            </div>
          </motion.div>

          {/* Feature 3: Financial Risk Quantification */}
          <motion.div
            whileHover={{ y: -5 }}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">FAIR Loss Engine</span>
              <h4 className="text-sm font-bold text-white">Financial Loss (EAL / P90 / P95 / P99)</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                100,000 Monte Carlo iterations produce mean expected annual loss alongside extreme tail thresholds.
              </p>
            </div>

            {/* Embedded Live Mini-Vis */}
            <div className="h-28 bg-[#06090F] rounded-xl border border-slate-800 p-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">EAL (Mean)</span>
                <span className="text-sm font-bold text-amber-400">₹1.60 Cr</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">P95 Extreme</span>
                <span className="text-sm font-bold text-red-400">₹4.10 Cr</span>
              </div>
            </div>
          </motion.div>

          {/* Feature 4: What-If Simulator */}
          <motion.div
            whileHover={{ y: -5 }}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">Decision Modeling</span>
              <h4 className="text-sm font-bold text-white">What-If Control Simulator</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Test the modeled financial effect of deploying MFA, patching, or EDR before spending capital.
              </p>
            </div>

            {/* Embedded Live Mini-Vis */}
            <div className="h-28 bg-[#06090F] rounded-xl border border-slate-800 p-3 flex flex-col justify-between font-mono text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Simulate MFA (100%):</span>
                <button
                  onClick={() => {
                    setIsSimMfaEnabled(!isSimMfaEnabled);
                    setSimAfter(isSimMfaEnabled ? 1.6 : 0.98);
                  }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    isSimMfaEnabled ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isSimMfaEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                <span>Risk Delta:</span>
                <span className="font-extrabold text-emerald-400">₹{simBefore}Cr → ₹{simAfter}Cr</span>
              </div>
            </div>
          </motion.div>

          {/* Feature 5: Budget-Optimized Investment Planning */}
          <motion.div
            whileHover={{ y: -5 }}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">Portfolio Solver</span>
              <h4 className="text-sm font-bold text-white">Knapsack Investment Optimizer</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Finds the optimal security portfolio under an explicit fixed budget constraint (e.g. ₹1.00 Cr).
              </p>
            </div>

            {/* Embedded Live Mini-Vis */}
            <div className="h-28 bg-[#06090F] rounded-xl border border-slate-800 p-3 flex flex-col justify-center space-y-2 font-mono text-[10px]">
              <div className="flex justify-between text-slate-300">
                <span>Budget Allocated:</span>
                <span className="text-cyan-300 font-bold">₹75L / ₹1.00 Cr</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-cyan-500 h-full rounded-full w-[75%]"></div>
              </div>
              <span className="text-emerald-400 text-[9px]">Portfolio ROSI: 1.21x Return</span>
            </div>
          </motion.div>

          {/* Feature 6: AI Risk Copilot */}
          <motion.div
            whileHover={{ y: -5 }}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">Executive AI Assistant</span>
              <h4 className="text-sm font-bold text-white">AI Cyber Risk Copilot</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Translates technical vulnerability telemetry into executive business language for CFOs and Board members.
              </p>
            </div>

            {/* Embedded Live Mini-Vis */}
            <div className="h-28 bg-[#06090F] rounded-xl border border-slate-800 p-2.5 font-mono text-[10px] space-y-1 overflow-hidden">
              <div className="text-cyan-400 font-bold flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                <span>Copilot Stream:</span>
              </div>
              <p className="text-slate-300 text-[10px] leading-snug">
                "{copilotText}"<span className="animate-pulse text-cyan-400">|</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 5: DATA SOVEREIGNTY / SECURITY ("We never hold your data. You do.") */}
      <section id="sovereignty" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/60 relative">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-[#0B0F17] to-slate-950 border border-cyan-500/40 shadow-2xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="info">Zero Data Exposure Architecture</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">We never hold your data. You do.</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Deployable as a self-hosted Docker Compose or Kubernetes pod inside your private bank VPC or on-premise infrastructure.
            </p>
          </div>

          {/* Container Isolation Diagram */}
          <div className="p-6 rounded-2xl bg-[#06090F] border border-cyan-800/50 flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-xs">
            {/* Customer Bounded Container */}
            <div className="p-5 rounded-xl bg-slate-900 border-2 border-cyan-500/60 space-y-2 flex-1 w-full text-center relative shadow-lg shadow-cyan-950/40">
              <span className="absolute -top-3 left-4 px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700 uppercase">
                Customer VPC / On-Prem Boundary
              </span>
              <Building2 className="w-6 h-6 text-cyan-400 mx-auto" />
              <h4 className="font-bold text-white">CYBERX Engine & Database</h4>
              <p className="text-slate-400 text-[10px] font-sans">100% Customer Controlled Scope</p>
            </div>

            {/* Inbound Only Arrow */}
            <div className="flex flex-col items-center justify-center shrink-0 space-y-1">
              <span className="text-[10px] text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Public Threat Intel (NVD, KEV, EPSS) — Inbound Only
              </span>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-12 bg-cyan-500 animate-pulse"></div>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

            {/* Public Intel Cloud */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex-1 w-full text-center">
              <Cloud className="w-6 h-6 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-300">Public Threat Intelligence</h4>
              <p className="text-slate-500 text-[10px] font-sans">Anonymous Vulnerability Feeds</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: THE MATH / CREDIBILITY SECTION */}
      <section id="credibility" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/60 relative">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Open Frameworks</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Built on Industry-Standard Financial Risk Ontologies</h3>
        </div>

        {/* Framework Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono mb-12">
          {[
            'FAIR Risk Model (ISO/IEC 27005)',
            'CVSS v3.1 / v4.0',
            'CISA Known Exploited Vulns (KEV)',
            'FIRST EPSS Exploit Scoring',
            'NIST CSF v2.0',
            'RBI & SEBI Cybersecurity Frameworks',
          ].map((fw, idx) => (
            <div key={idx} className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 shadow-md">
              {fw}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: TESTIMONIAL / SOCIAL PROOF */}
      <section className="py-20 px-6 max-w-4xl mx-auto border-t border-slate-800/60 text-center relative">
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 mx-auto">
            <Building2 className="w-5 h-5" />
          </div>
          <blockquote className="text-base sm:text-lg text-slate-200 italic font-sans leading-relaxed">
            "CYBERX allowed us to transform vulnerability remediation from endless spreadsheet debates into a clear capital decision our CFO approved in 15 minutes."
          </blockquote>
          <div className="text-xs font-mono text-cyan-400">
            — Senior Vice President of Cyber Risk, Leading Financial Institution
          </div>
        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section className="py-24 px-6 max-w-6xl mx-auto border-t border-slate-800/60 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to quantify cyber risk in financial terms?
          </h2>
          <p className="text-sm text-slate-400">
            Launch the platform dashboard now or inspect our deterministic loss modeling engine.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/dashboard">
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 group">
                <span>Launch CYBERX Platform</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href="/copilot">
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Ask AI Copilot</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 9: FOOTER */}
      <footer className="border-t border-slate-800/80 px-6 py-12 text-xs text-slate-500 font-mono bg-[#030508] relative">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">CYBERX Risk Intelligence</span>
            <span>• © 2026 IndoBank Financial Services</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/dashboard" className="hover:text-cyan-400">Dashboard</Link>
            <Link href="/risk" className="hover:text-cyan-400">Risk Model</Link>
            <Link href="/optimizer" className="hover:text-cyan-400">Optimizer</Link>
            <Link href="/compliance" className="hover:text-cyan-400">Compliance</Link>
            <Link href="/data-sources" className="hover:text-cyan-400">Data Sources</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
