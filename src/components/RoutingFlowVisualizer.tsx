import React from 'react';
import { Cpu, Zap, CheckCircle2, ShieldCheck, Terminal, AlertTriangle, ArrowRight, Gauge } from 'lucide-react';
import { RoutingDecision } from '../types.ts';

interface RoutingFlowVisualizerProps {
  currentDecision: RoutingDecision | null;
  activeRoute: 'local' | 'gemma-4' | null;
  isProcessing: boolean;
  isValidJson?: boolean;
  gemmaModelId?: string;
  measuredLatencyMs?: number;
}

export const RoutingFlowVisualizer: React.FC<RoutingFlowVisualizerProps> = ({
  currentDecision,
  activeRoute,
  isProcessing,
  isValidJson,
  gemmaModelId = 'gemma-4-26b-a4b-it',
  measuredLatencyMs,
}) => {
  const isLocalActive = activeRoute === 'local' || (currentDecision?.route === 'local' && !activeRoute);
  const isModelActive = activeRoute === 'gemma-4' || (currentDecision?.route === 'gemma-4' && !activeRoute);

  return (
    <div className="bg-[#0e1618] border border-emerald-950/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Intelligent Routing Pipeline
          </h2>
          {isProcessing && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 animate-pulse">
              Routing in progress...
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-zinc-400">Classifier Overhead:</span>
          <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            &lt;0.5ms (CPU Native)
          </span>
          {measuredLatencyMs !== undefined && (
            <span className="text-zinc-300 bg-[#131d20] border border-zinc-700 px-2 py-0.5 rounded flex items-center space-x-1">
              <Gauge className="w-3 h-3 text-emerald-400" />
              <span>{measuredLatencyMs}ms total</span>
            </span>
          )}
        </div>
      </div>

      {/* Visual Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Step 1: Input Ingestion */}
        <div className="border border-zinc-800/80 bg-[#121c1e]/70 rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-zinc-400">STAGE 01</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-xs font-bold text-white">Task Ingestion</div>
          <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
            Payload parsed locally in memory. Zero network request initiated.
          </p>
        </div>

        {/* Step 2: Deterministic Rule Classifier */}
        <div className="border border-zinc-800/80 bg-[#121c1e]/70 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-zinc-400">STAGE 02</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.5 rounded font-medium">
              Zero Model
            </span>
          </div>
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>Heuristic Classifier</span>
            {currentDecision && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-1 rounded border border-emerald-900/60">
                {currentDecision.estimatedComplexity}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
            Deterministic AST & regex rules evaluate in &lt;0.5ms on CPU.
          </p>
          {currentDecision && (
            <div className="mt-2 text-[10px] font-mono text-zinc-300 bg-[#0a0f10] border border-zinc-800 rounded p-1 truncate">
              {currentDecision.ruleId}
            </div>
          )}
        </div>

        {/* Step 3: Branching Route */}
        <div className="border border-zinc-800/80 bg-[#121c1e]/70 rounded-xl p-3.5 relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-zinc-400">STAGE 03</span>
            <span className="text-[10px] font-mono text-zinc-400">Execution Route</span>
          </div>

          <div className="space-y-1.5 mt-1">
            {/* Local Branch */}
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                isLocalActive
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600 shadow-sm shadow-emerald-900/40 ring-1 ring-emerald-500/30'
                  : 'bg-[#0c1214] text-zinc-500 border-zinc-800/70 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-[11px]">Local CPU Engine</span>
              </div>
              <span className={`text-[10px] font-mono ${isLocalActive ? 'text-emerald-400 font-bold' : 'text-zinc-600'}`}>
                0 tokens
              </span>
            </div>

            {/* Gemma 4 Branch */}
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                isModelActive
                  ? 'bg-teal-950/90 text-teal-200 border-teal-600 shadow-sm shadow-teal-900/40 ring-1 ring-teal-500/30'
                  : 'bg-[#0c1214] text-zinc-500 border-zinc-800/70 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 truncate">
                <Zap className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="font-semibold text-[11px] truncate">Gemma 4 ({gemmaModelId})</span>
              </div>
              <span className={`text-[10px] font-mono shrink-0 ml-1 ${isModelActive ? 'text-teal-400 font-bold' : 'text-zinc-600'}`}>
                GenAI SDK
              </span>
            </div>
          </div>
        </div>

        {/* Step 4: Validation & Telemetry */}
        <div className="border border-zinc-800/80 bg-[#121c1e]/70 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-zinc-400">STAGE 04</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-white">Validation Guardrail</div>
          <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
            Parses output syntax and provides single-click retry on failure.
          </p>
          {isValidJson !== undefined && (
            <div className="mt-2 flex items-center space-x-1 text-[10px]">
              {isValidJson ? (
                <span className="text-emerald-400 flex items-center font-medium bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid JSON Output
                </span>
              ) : (
                <span className="text-amber-400 flex items-center font-medium bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800/40">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Unstructured Text
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
