import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Clock,
  Coins,
  Copy,
  Check,
  AlertTriangle,
  RotateCw,
  Download,
  Info,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { ExecutionResult } from '../types.ts';

interface ResultPanelProps {
  result: ExecutionResult | null;
  onRetry: () => void;
  isRetrying: boolean;
  isExecuting?: boolean;
  onOpenSetup: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  onRetry,
  isRetrying,
  isExecuting,
}) => {
  const [copied, setCopied] = useState(false);

  // Loading state placeholder when executing
  if (isExecuting && !result) {
    return (
      <div className="bg-[#0e1618] border border-emerald-950/60 rounded-2xl p-8 sm:p-12 text-center shadow-xl shadow-black/40 flex flex-col items-center justify-center min-h-[360px]">
        <div className="relative mb-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl animate-pulse"></div>
        </div>
        <h3 className="text-base font-bold text-white tracking-wide">
          Evaluating Processing Route...
        </h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed">
          Running sub-millisecond heuristic classification on CPU. Deterministic tasks execute locally; complex reasoning routes to Gemma 4 via Google Gen AI SDK.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-[#0e1618] border border-zinc-800/80 border-dashed rounded-2xl p-8 sm:p-12 text-center shadow-xl shadow-black/40 flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-14 h-14 rounded-2xl bg-[#131d20] border border-zinc-800 text-zinc-500 flex items-center justify-center mb-4">
          <Layers className="w-7 h-7 text-zinc-400" />
        </div>
        <h3 className="text-base font-bold text-zinc-200">Execution Workspace Ready</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed">
          Select an example demonstration or submit a custom task to observe EcoRoute Lite distinguish deterministic routines from neural inference.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isJson = result.isValidJson;
    const blob = new Blob([result.output], {
      type: isJson ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecoroute-output-${Date.now()}.${isJson ? 'json' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLocal = result.route === 'local';

  return (
    <div className="bg-[#0e1618] border border-emerald-950/60 rounded-2xl overflow-hidden shadow-xl shadow-black/40">
      {/* Route Decision Header Banner */}
      <div
        className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isLocal
            ? 'bg-gradient-to-r from-[#0e2421] to-[#0c1b1c] border-emerald-900/60'
            : 'bg-gradient-to-r from-[#0c2227] to-[#0a191d] border-teal-900/60'
        }`}
      >
        <div className="flex items-start sm:items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              isLocal
                ? 'bg-emerald-500 text-white shadow-emerald-950 ring-1 ring-emerald-400/40'
                : 'bg-teal-600 text-white shadow-teal-950 ring-1 ring-teal-400/40'
            }`}
          >
            {isLocal ? <Cpu className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                Selected Processing Route
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isLocal
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80'
                    : 'bg-teal-950 text-teal-300 border border-teal-700/80'
                }`}
              >
                {isLocal ? 'Local Deterministic CPU' : `Gemma 4 (${result.modelId || 'gemma-4-26b-a4b-it'})`}
              </span>
            </div>
            <div className="text-sm font-bold text-white mt-0.5">{result.ruleName}</div>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div className="flex items-center space-x-2 flex-wrap text-xs font-mono">
          {/* Measured Latency */}
          <div className="flex items-center space-x-1.5 bg-[#090f10] border border-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-bold text-white">{result.elapsedMs}ms</span>
            <span className="text-[10px] text-zinc-400">(Measured)</span>
          </div>

          {/* Model Call */}
          <div className="flex items-center space-x-1.5 bg-[#090f10] border border-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300">
            <span className="text-[10px] text-zinc-400">Model:</span>
            <span className={result.modelCall ? 'text-teal-400 font-bold' : 'text-emerald-400 font-bold'}>
              {result.modelCall ? 'GenAI SDK' : 'No (CPU)'}
            </span>
          </div>

          {/* Tokens */}
          <div className="flex items-center space-x-1.5 bg-[#090f10] border border-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300">
            <span className="text-[10px] text-zinc-400">Tokens:</span>
            <span className={result.tokensUsed.totalTokens > 0 ? 'text-white font-bold' : 'text-emerald-400 font-bold'}>
              {result.tokensUsed.totalTokens > 0 ? `${result.tokensUsed.totalTokens} (Measured)` : '0 (Offloaded)'}
            </span>
          </div>

          {/* Cost */}
          <div className="flex items-center space-x-1.5 bg-[#090f10] border border-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300">
            <Coins className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-bold text-white">${result.estimatedCostUsd.toFixed(5)}</span>
            <span className="text-[10px] text-zinc-400">(Est.)</span>
          </div>
        </div>
      </div>

      {/* Decision Rationale Explanation Card */}
      <div className="p-4 bg-[#11191b] border-b border-zinc-800/80 text-xs">
        <div className="flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-white">Routing Rationale & Architecture Decision:</div>
            <p className="text-zinc-300 mt-1 leading-relaxed">{result.reason}</p>
            {result.matchedPattern && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="bg-[#0a0f10] border border-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">
                  Matched: {result.matchedPattern}
                </span>
                <span className="bg-[#0a0f10] border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                  Rule ID: {result.ruleId}
                </span>
                <span className="bg-[#0a0f10] border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                  Execution: {isLocal ? '100% In-Process CPU' : 'Google Gen AI SDK'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON Validation Alert / Retry Option */}
      {result.jsonValidationError && (
        <div className="p-4 bg-amber-950/40 border-b border-amber-800/60 text-xs text-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold text-amber-300">JSON Schema Validation Warning</div>
              <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                The output does not conform to valid JSON: <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">{result.jsonValidationError}</code>
              </p>
            </div>
          </div>

          {result.retryAvailable && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center space-x-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry with Strict Guardrail'}</span>
            </button>
          )}
        </div>
      )}

      {/* Output Content Area */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Validated Execution Response
            </span>
            {result.isValidJson && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Validated JSON</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-[#121c1e] hover:bg-[#162427] flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Copy output to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Response'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-[#121c1e] hover:bg-[#162427] flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Download response file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Preformatted text / code viewer */}
        <div className="bg-[#060a0b] text-emerald-100/90 rounded-xl p-4 sm:p-5 font-mono text-xs overflow-x-auto max-h-[460px] leading-relaxed border border-zinc-800 shadow-inner">
          <pre className="whitespace-pre-wrap selection:bg-emerald-500/30 selection:text-white">{result.output}</pre>
        </div>

        {/* Footnote on Compute & Transparency */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 gap-2">
          <div>
            {isLocal ? (
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>100% Deterministic CPU Execution &middot; 0 API Tokens &middot; Zero GPU Overhead</span>
              </span>
            ) : (
              <span className="text-teal-300 font-medium">
                Processed via Google Gen AI SDK ({result.modelId || 'gemma-4-26b-a4b-it'}) &middot; Exact Token Telemetry
              </span>
            )}
          </div>
          <div className="text-zinc-500 font-mono">
            Measurements are experimental &middot; Zero fabricated carbon metrics
          </div>
        </div>
      </div>
    </div>
  );
};
