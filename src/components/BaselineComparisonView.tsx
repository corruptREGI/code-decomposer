import React from 'react';
import { Scale, Zap, Cpu, AlertCircle, X, CheckCircle2, Clock, Coins, ShieldCheck } from 'lucide-react';
import { ComparisonResult } from '../types.ts';

interface BaselineComparisonViewProps {
  comparisonData: ComparisonResult | null;
  onClose: () => void;
  onOpenSetup: () => void;
}

export const BaselineComparisonView: React.FC<BaselineComparisonViewProps> = ({
  comparisonData,
  onClose,
  onOpenSetup,
}) => {
  if (!comparisonData) return null;

  const { ecoRoute, baseline, comparison, baselineError } = comparisonData;

  return (
    <div className="bg-[#0e1618] border-2 border-emerald-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0d2a25] via-[#0f322c] to-[#0c2428] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-900/60">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base tracking-wide text-white">
              EcoRoute vs Un-routed Gemma 4 Baseline
            </h3>
            <p className="text-xs text-emerald-300/80">
              Measuring deterministic green routing against direct model inference via Google Gen AI SDK
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-300 hover:text-white transition-colors cursor-pointer"
          title="Close comparison"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Baseline Model Error (if applicable) */}
      {baselineError && (
        <div className="p-4 bg-amber-950/40 border-b border-amber-800/60 text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{baselineError}</span>
          </div>
          <button
            onClick={onOpenSetup}
            className="text-xs font-semibold underline text-amber-300 hover:text-white ml-3 cursor-pointer"
          >
            Review Model Secrets
          </button>
        </div>
      )}

      {/* Comparison Scoreboard */}
      {comparison && (
        <div className="bg-[#121c1e] border-b border-zinc-800/80 p-4 sm:p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {/* Latency Reduction */}
            <div className="bg-[#0b1011] border border-emerald-900/60 rounded-xl p-3">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                Latency Reduction
              </div>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                {comparison.latencyReductionPercent}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {comparison.latencySavedMs.toFixed(1)}ms faster (Measured)
              </div>
            </div>

            {/* Tokens Saved */}
            <div className="bg-[#0b1011] border border-emerald-900/60 rounded-xl p-3">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                Tokens Saved
              </div>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                {comparison.tokensSaved}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {comparison.tokenReductionPercent}% offload (Measured)
              </div>
            </div>

            {/* Compute Route */}
            <div className="bg-[#0b1011] border border-zinc-800 rounded-xl p-3">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                EcoRoute Path
              </div>
              <div className="text-sm font-bold text-white mt-1.5 flex items-center justify-center space-x-1.5">
                {comparison.isLocalOffload ? (
                  <>
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Local CPU Engine</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-teal-400" />
                    <span className="text-teal-300">Gemma 4</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {comparison.isLocalOffload ? '0 API tokens' : 'Neural required'}
              </div>
            </div>

            {/* Cost Avoidance */}
            <div className="bg-[#0b1011] border border-zinc-800 rounded-xl p-3">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                Cost Avoidance (Est.)
              </div>
              <div className="text-xl font-extrabold text-white mt-1 font-mono">
                ${((baseline?.estimatedCostUsd || 0) - (ecoRoute?.estimatedCostUsd || 0)).toFixed(5)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Per execution</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-emerald-200 bg-emerald-950/60 border border-emerald-800/60 rounded-xl p-3 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Compute Offload Summary:</span>{' '}
              {comparison.factualComputeSummary}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
        {/* Left: EcoRoute */}
        <div className="p-5 bg-[#0c1214] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="font-bold text-xs text-white uppercase tracking-wider">
                  EcoRoute Lite Path
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {ecoRoute.route === 'local' ? 'Deterministic Engine' : 'Gemma 4'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-3 text-xs font-mono bg-[#111a1c] p-2.5 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block text-[10px]">TIME (Measured)</span>
                <span className="font-bold text-emerald-400">{ecoRoute.elapsedMs}ms</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">TOKENS (Measured)</span>
                <span className="font-bold text-white">{ecoRoute.tokensUsed.totalTokens}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">COST (Est.)</span>
                <span className="font-bold text-white">${ecoRoute.estimatedCostUsd.toFixed(5)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-3 italic">"{ecoRoute.reason}"</p>

            <div className="bg-[#060a0b] text-emerald-100/90 p-4 rounded-xl text-xs font-mono max-h-56 overflow-y-auto whitespace-pre-wrap border border-zinc-800/80">
              {ecoRoute.output}
            </div>
          </div>
        </div>

        {/* Right: Un-routed Gemma 4 Baseline */}
        <div className="p-5 bg-[#0a0f10] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500"></span>
                <span className="font-bold text-xs text-zinc-300 uppercase tracking-wider">
                  Un-routed Gemma 4 Baseline
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700">
                Direct Google GenAI SDK
              </span>
            </div>

            {baseline ? (
              <>
                <div className="grid grid-cols-3 gap-2 my-3 text-xs font-mono bg-[#111a1c] p-2.5 rounded-xl border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">TIME (Measured)</span>
                    <span className="font-bold text-zinc-200">{baseline.elapsedMs}ms</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">TOKENS (Measured)</span>
                    <span className="font-bold text-white">{baseline.tokensUsed.totalTokens}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">COST (Est.)</span>
                    <span className="font-bold text-white">${baseline.estimatedCostUsd.toFixed(5)}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mb-3 italic">
                  Invokes remote model cluster regardless of task simplicity, consuming network latency & token budgets.
                </p>

                <div className="bg-[#060a0b] text-zinc-300 p-4 rounded-xl text-xs font-mono max-h-56 overflow-y-auto whitespace-pre-wrap border border-zinc-800/80">
                  {baseline.output}
                </div>
              </>
            ) : (
              <div className="p-8 bg-[#0c1214] border border-zinc-800 border-dashed rounded-xl text-center text-xs text-zinc-400">
                Baseline model could not be reached. Check API key configuration in Model & Secrets.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Experimental Disclaimer Footer */}
      <div className="bg-[#080d0e] px-5 sm:px-6 py-3 text-[11px] text-zinc-400 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>
          <strong className="text-zinc-300">Scientific Notice:</strong> Measurements are experimental based on real server response times and exact token usage.
        </span>
        <span className="text-zinc-400 font-mono">Carbon & energy savings are never fabricated.</span>
      </div>
    </div>
  );
};
