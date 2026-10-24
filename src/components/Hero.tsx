import React from 'react';
import { Leaf, Cpu, Zap, ShieldCheck } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#111c1e] to-[#0c1315] border border-emerald-950/70 p-6 sm:p-8 shadow-xl shadow-black/40">
      {/* Background emerald glow accents */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 right-4 w-64 h-64 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            <span>Green AI Hackathon Prototype</span>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#141f22] border border-zinc-800 text-zinc-300 text-xs font-mono">
            <span>Deterministic CPU + Gemma 4 (26B A4B IT)</span>
          </div>
        </div>

        {/* Hero Heading */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          Smarter AI.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
            Less Waste.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
          EcoRoute Lite chooses an appropriate processing route for each task. It evaluates deterministic requests like email parsing, lexical statistics, and JSON formatting locally on CPU in <strong className="text-emerald-400 font-semibold">&lt;0.5ms with 0 tokens</strong>, reserving <strong className="text-teal-300 font-semibold">Gemma 4 neural inference</strong> strictly for complex reasoning and synthesis.
        </p>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-emerald-950/60">
          <div className="flex items-center space-x-2.5 text-xs text-zinc-300">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span><strong>Zero Model Overhead</strong> on deterministic jobs</span>
          </div>

          <div className="flex items-center space-x-2.5 text-xs text-zinc-300">
            <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <span><strong>Gemma 4 via Gen AI SDK</strong> for multi-step reasoning</span>
          </div>

          <div className="flex items-center space-x-2.5 text-xs text-zinc-300">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span><strong>Zero Fabricated Data</strong> &middot; Real telemetry only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
