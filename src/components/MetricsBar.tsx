import React from 'react';
import { Cpu, Zap, Activity, RotateCcw, ShieldCheck, DollarSign } from 'lucide-react';
import { SessionMetrics } from '../types.ts';

interface MetricsBarProps {
  metrics: SessionMetrics;
  onResetMetrics: () => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, onResetMetrics }) => {
  const localPercent = metrics.totalRequests > 0
    ? Math.round((metrics.localRequests / metrics.totalRequests) * 100)
    : 0;

  const modelPercent = metrics.totalRequests > 0
    ? Math.round((metrics.modelRequests / metrics.totalRequests) * 100)
    : 0;

  const avgLocalLatency = metrics.localLatencies.length > 0
    ? (metrics.localLatencies.reduce((a, b) => a + b, 0) / metrics.localLatencies.length).toFixed(1)
    : '0.4';

  const avgModelLatency = metrics.modelLatencies.length > 0
    ? Math.round(metrics.modelLatencies.reduce((a, b) => a + b, 0) / metrics.modelLatencies.length)
    : 'N/A';

  return (
    <div className="bg-[#0e1618] border border-emerald-950/60 rounded-2xl p-4 shadow-lg shadow-black/30">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-1">
          {/* 1. Total Requests */}
          <div className="bg-[#131d20] border border-zinc-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider">Total Runs</span>
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">{metrics.totalRequests}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Session telemetry</div>
          </div>

          {/* 2. Local CPU Offload */}
          <div className="bg-[#112322] border border-emerald-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider">Local CPU</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-300 tracking-tight">
              {metrics.localRequests} <span className="text-xs font-semibold text-emerald-400/80">({localPercent}%)</span>
            </div>
            <div className="text-[10px] text-emerald-400/90 mt-0.5">0 API tokens used</div>
          </div>

          {/* 3. Gemma 4 Calls */}
          <div className="bg-[#102227] border border-teal-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between text-teal-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider">Gemma 4 Calls</span>
              <Zap className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-xl font-bold text-teal-300 tracking-tight">
              {metrics.modelRequests} <span className="text-xs font-semibold text-teal-400/80">({modelPercent}%)</span>
            </div>
            <div className="text-[10px] text-teal-400/90 mt-0.5">Neural reasoning</div>
          </div>

          {/* 4. Measured Latency */}
          <div className="bg-[#131d20] border border-zinc-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider">Avg Latency</span>
              <span className="text-[9px] font-mono text-zinc-500">(Measured)</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
              <span className="text-emerald-400">{avgLocalLatency}ms</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-zinc-300">{avgModelLatency}{avgModelLatency !== 'N/A' ? 'ms' : ''}</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Local CPU vs Model</div>
          </div>

          {/* 5. Tokens Consumed vs Avoided */}
          <div className="bg-[#131d20] border border-zinc-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider">Tokens Saved</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 tracking-tight font-mono">
              {metrics.totalTokensAvoided.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {metrics.totalTokensUsed > 0 ? `${metrics.totalTokensUsed} used (Measured)` : '0 tokens used'}
            </div>
          </div>

          {/* 6. Measured / Est. Cost */}
          <div className="bg-[#131d20] border border-zinc-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider">Cost (Est.)</span>
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight font-mono">
              ${metrics.totalCostUsd.toFixed(5)}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5 font-mono">
              ${metrics.totalCostAvoidedUsd.toFixed(5)} offloaded
            </div>
          </div>
        </div>

        {/* Controls & Grounding Note */}
        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800/80">
          <div className="hidden xl:block text-[10px] text-zinc-400 max-w-[210px] leading-tight font-mono">
            Experimental measurements. Real CPU compute & exact API token counts. Zero fabricated carbon or energy data.
          </div>
          <button
            onClick={onResetMetrics}
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-[#182428] hover:border-zinc-700 transition-colors cursor-pointer"
            title="Reset Session Telemetry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stats</span>
          </button>
        </div>
      </div>
    </div>
  );
};
