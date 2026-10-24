import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { MetricsBar } from './components/MetricsBar.tsx';
import { RoutingFlowVisualizer } from './components/RoutingFlowVisualizer.tsx';
import { TaskInput, PRESET_EXAMPLES } from './components/TaskInput.tsx';
import { ResultPanel } from './components/ResultPanel.tsx';
import { BaselineComparisonView } from './components/BaselineComparisonView.tsx';
import { SetupModal } from './components/SetupModal.tsx';
import { classifyRequest } from './lib/router.ts';
import {
  ServerStatus,
  ExecutionResult,
  ComparisonResult,
  SessionMetrics,
  RoutingDecision,
} from './types.ts';
import { Sliders, ShieldAlert, Leaf } from 'lucide-react';

const INITIAL_METRICS: SessionMetrics = {
  totalRequests: 0,
  localRequests: 0,
  modelRequests: 0,
  totalTokensUsed: 0,
  totalTokensAvoided: 0,
  totalCostUsd: 0,
  totalCostAvoidedUsd: 0,
  localLatencies: [],
  modelLatencies: [],
};

export default function App() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [prompt, setPrompt] = useState<string>(PRESET_EXAMPLES[0].prompt);
  const [enforceJson, setEnforceJson] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [modelError, setModelError] = useState<{ message: string; help?: string } | null>(null);

  // Session telemetry state
  const [metrics, setMetrics] = useState<SessionMetrics>(() => {
    try {
      const saved = localStorage.getItem('ecoroute_metrics');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_METRICS;
  });

  // Save metrics to local storage
  useEffect(() => {
    try {
      localStorage.setItem('ecoroute_metrics', JSON.stringify(metrics));
    } catch {
      // ignore
    }
  }, [metrics]);

  // Fetch backend status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch server status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Real-time classification calculation as user edits the prompt
  const predictedDecision: RoutingDecision | null = useMemo(() => {
    if (!prompt.trim()) return null;
    return classifyRequest(prompt);
  }, [prompt]);

  // Execute request
  const handleExecute = async (forceRoute: 'auto' | 'local' | 'gemma', isRetry = false) => {
    if (!prompt.trim()) return;

    if (isRetry) {
      setIsRetrying(true);
    } else {
      setIsExecuting(true);
    }
    setModelError(null);
    setComparisonData(null);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          forceRoute,
          enforceJson,
          isRetry,
        }),
      });

      const data = await res.json();

      if (res.status === 503 && data.status === 'endpoint_missing') {
        setModelError({
          message: data.error || 'Google Gemini API key is missing.',
          help: data.setupInstructions?.message,
        });
        setResult(null);
        return;
      }

      if (res.status === 502 && data.status === 'model_unavailable') {
        setModelError({
          message: data.error || 'Gemma 4 model is unavailable.',
          help: data.help,
        });
        setResult(null);
        return;
      }

      if (!res.ok || data.status === 'error') {
        throw new Error(data.error || 'Execution failed');
      }

      const execResult: ExecutionResult = data.result;
      setResult(execResult);

      // Update metrics
      setMetrics((prev) => {
        const isLocal = execResult.route === 'local';
        const newTotal = prev.totalRequests + 1;
        const newLocal = isLocal ? prev.localRequests + 1 : prev.localRequests;
        const newModel = !isLocal ? prev.modelRequests + 1 : prev.modelRequests;

        const tokensUsed = execResult.tokensUsed.totalTokens;
        // Estimated tokens avoided for local task: based on prompt length (avg 3.5 chars/token + typical completion)
        const avoidedTokens = isLocal ? Math.max(80, Math.round(prompt.length / 3.5) + 120) : 0;
        const avoidedCost = isLocal ? (avoidedTokens * 0.25) / 1000000 : 0;

        return {
          totalRequests: newTotal,
          localRequests: newLocal,
          modelRequests: newModel,
          totalTokensUsed: prev.totalTokensUsed + tokensUsed,
          totalTokensAvoided: prev.totalTokensAvoided + avoidedTokens,
          totalCostUsd: prev.totalCostUsd + execResult.estimatedCostUsd,
          totalCostAvoidedUsd: prev.totalCostAvoidedUsd + avoidedCost,
          localLatencies: isLocal
            ? [...prev.localLatencies.slice(-19), execResult.elapsedMs]
            : prev.localLatencies,
          modelLatencies: !isLocal
            ? [...prev.modelLatencies.slice(-19), execResult.elapsedMs]
            : prev.modelLatencies,
        };
      });
    } catch (err: any) {
      setModelError({
        message: err.message || 'Error executing request.',
      });
    } finally {
      setIsExecuting(false);
      setIsRetrying(false);
    }
  };

  // Run baseline comparison (EcoRoute vs un-routed Gemma 4)
  const handleCompare = async () => {
    if (!prompt.trim()) return;

    setIsComparing(true);
    setModelError(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (res.status === 503 || data.status === 'model_unavailable') {
        setModelError({
          message: data.error || 'Gemma 4 model is unavailable for baseline comparison.',
          help: data.help,
        });
        return;
      }

      setComparisonData(data);
      if (data.ecoRoute) {
        setResult(data.ecoRoute);
      }
    } catch (err: any) {
      setModelError({
        message: err.message || 'Error running baseline comparison.',
      });
    } finally {
      setIsComparing(false);
    }
  };

  // Reset all
  const handleReset = () => {
    setPrompt('');
    setResult(null);
    setComparisonData(null);
    setModelError(null);
  };

  const handleResetMetrics = () => {
    setMetrics(INITIAL_METRICS);
    try {
      localStorage.removeItem('ecoroute_metrics');
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#080c0d] text-zinc-100 font-sans flex flex-col antialiased selection:bg-emerald-500/30 selection:text-white">
      {/* Top Navigation Bar with Leaf Icon */}
      <Navbar serverStatus={serverStatus} onOpenSetup={() => setSetupModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <Hero />

        {/* Model Error / Missing Setup Banner */}
        {modelError && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/30">
            <div className="flex items-start space-x-3.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Model Request Notification (Zero Silent Substitutions)
                </h4>
                <p className="text-xs text-amber-100 mt-0.5 font-medium leading-relaxed">
                  {modelError.message}
                </p>
                {modelError.help && (
                  <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                    {modelError.help}
                  </p>
                )}
                <p className="text-[11px] text-amber-400/90 mt-1.5 font-mono">
                  Deterministic tasks continue to execute 100% offline on CPU without any model API keys.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSetupModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Model</span>
            </button>
          </div>
        )}

        {/* Compact Measured Metrics Bar */}
        <MetricsBar metrics={metrics} onResetMetrics={handleResetMetrics} />

        {/* Visual Routing Pipeline with Stages */}
        <RoutingFlowVisualizer
          currentDecision={predictedDecision}
          activeRoute={result?.route || null}
          isProcessing={isExecuting || isComparing}
          isValidJson={result?.isValidJson}
          gemmaModelId={serverStatus?.gemmaModel}
          measuredLatencyMs={result?.elapsedMs}
        />

        {/* Baseline Comparison View (Rendered when comparison is requested) */}
        {comparisonData && (
          <BaselineComparisonView
            comparisonData={comparisonData}
            onClose={() => setComparisonData(null)}
            onOpenSetup={() => setSetupModalOpen(true)}
          />
        )}

        {/* Dual Column Workspace: Task Input & Execution Result */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Input, Presets & Controls */}
          <div>
            <TaskInput
              prompt={prompt}
              onChangePrompt={setPrompt}
              onExecute={handleExecute}
              onCompare={handleCompare}
              onReset={handleReset}
              isExecuting={isExecuting}
              isComparing={isComparing}
              predictedDecision={predictedDecision}
              enforceJson={enforceJson}
              onToggleEnforceJson={setEnforceJson}
            />
          </div>

          {/* Right Column: Execution Output & Explanation */}
          <div>
            <ResultPanel
              result={result}
              onRetry={() => handleExecute('auto', true)}
              isRetrying={isRetrying}
              isExecuting={isExecuting}
              onOpenSetup={() => setSetupModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#070b0c] py-6 text-xs text-zinc-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Leaf className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white">EcoRoute Lite</span>
            <span className="text-zinc-600">&middot;</span>
            <span className="text-zinc-400">Google Gen AI SDK &middot; Gemma 4 ({serverStatus?.gemmaModel || 'gemma-4-26b-a4b-it'})</span>
          </div>
          <div className="text-zinc-400 text-[11px] font-mono text-center sm:text-right">
            Server-side environment secrets &middot; No silent model substitutions &middot; Sub-millisecond CPU offload
          </div>
        </div>
      </footer>

      {/* Setup Guidance Modal */}
      <SetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        serverStatus={serverStatus}
        onRefreshStatus={fetchStatus}
      />
    </div>
  );
}
