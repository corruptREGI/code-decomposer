import React, { useState } from 'react';
import { Play, Sparkles, RotateCcw, ArrowRight, ShieldCheck, Scale, Cpu, Zap, Code2, BrainCircuit, FileText } from 'lucide-react';
import { RoutingDecision } from '../types.ts';

export interface PresetExample {
  title: string;
  category: 'Simple / Local' | 'Coding' | 'Complex Reasoning';
  description: string;
  prompt: string;
  enforceJson?: boolean;
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    title: 'Extract Emails',
    category: 'Simple / Local',
    description: 'Solves via RFC 5322 regex on CPU (0 tokens, <1ms)',
    prompt: `Extract all email addresses from this directory dump:
Alex Rivera: alex.rivera@ecoroute.org (Engineering Lead)
Support team: support@example.com, queries: help-desk@ecoroute.io
Billing inquiries: finance-team@example.com, alex.rivera@ecoroute.org
External audit contact: auditor.smith@security-firm.net`,
  },
  {
    title: 'Word Count & Stats',
    category: 'Simple / Local',
    description: 'Native lexical analysis & reading time metrics',
    prompt: `Count words and text stats:
EcoRoute Lite demonstrates the paradigm of green AI computing. By deterministically solving tasks like regex extraction, lexical counting, and JSON normalization right on the CPU, developers can eliminate unnecessary GPU inference cycles, drastically reduce token expenditures, and achieve near-zero latency for millions of repetitive API calls without sacrificing accuracy.`,
  },
  {
    title: 'Clean Whitespace',
    category: 'Simple / Local',
    description: 'String buffer normalizer with zero model overhead',
    prompt: `Clean whitespace and remove extra blank lines from this payload:

      const    config   =    {
            model:    "gemma-4-26b-a4b-it",

            provider:    "Google Gen AI SDK",

            port:     3000

      };   

`,
  },
  {
    title: 'Format & Validate JSON',
    category: 'Simple / Local',
    description: 'Deterministic AST syntax formatting & linting',
    prompt: `Format and validate this JSON:
{"app":"EcoRoute Lite","version":"1.0.0","tags":["green-ai","gemma-4","google-genai-sdk"],"runtime":{"env":"edge-cpu","latency_ms":0.4,"cost_usd":0.000}}`,
  },
  {
    title: 'CSV Table to JSON',
    category: 'Coding',
    description: 'Tabular delimited serializer on local CPU',
    prompt: `CSV to JSON:
id,model_name,parameters,architecture,open_weight
1,gemma-4-26b-a4b-it,26B,Mixture of Attention,true
2,gemma-4-31b-it,31B,Instruction-Tuned,true
3,gemma-2-27b,27B,Sliding Window Attention,true`,
  },
  {
    title: 'Streaming Window Logic',
    category: 'Coding',
    description: 'TypeScript algorithm synthesis via Gemma 4',
    prompt: `Design a TypeScript algorithm to deduplicate and batch streaming telemetry events with a sliding 5-second window. Include reasoning about edge cases such as clock drift and out-of-order packets.`,
  },
  {
    title: 'Gemma 4 Architecture Efficiency',
    category: 'Complex Reasoning',
    description: 'Multi-step neural reasoning on open-weights parameter design',
    prompt: `Explain how Gemma 4 (gemma-4-26b-a4b-it) achieves high parameter efficiency and how open-weight models empower developers to build green, energy-conscious AI systems.`,
  },
  {
    title: 'Synthesize JSON Profile',
    category: 'Complex Reasoning',
    description: 'Generative schema synthesis with strict validation',
    enforceJson: true,
    prompt: `Generate a structured JSON profile for an open-weight AI engineer named Elena Torres at a sustainable computing lab. Include fields: name, role, organization, favoriteModels (array), researchFocus, and hardwareSpecs (object with gpu, vram, tdp). Return strictly valid JSON.`,
  },
];

interface TaskInputProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  onExecute: (forceRoute: 'auto' | 'local' | 'gemma') => void;
  onCompare: () => void;
  onReset: () => void;
  isExecuting: boolean;
  isComparing: boolean;
  predictedDecision: RoutingDecision | null;
  enforceJson: boolean;
  onToggleEnforceJson: (val: boolean) => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({
  prompt,
  onChangePrompt,
  onExecute,
  onCompare,
  onReset,
  isExecuting,
  isComparing,
  predictedDecision,
  enforceJson,
  onToggleEnforceJson,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const isBusy = isExecuting || isComparing;
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isBusy && prompt.trim()) {
        onExecute('auto');
      }
    }
  };

  const categories = ['All', 'Simple / Local', 'Coding', 'Complex Reasoning'];
  const filteredExamples = selectedCategory === 'All'
    ? PRESET_EXAMPLES
    : PRESET_EXAMPLES.filter((ex) => ex.category === selectedCategory);

  return (
    <div className="bg-[#0e1618] border border-emerald-950/60 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40">
      {/* Preset Category Filter & Example Chips */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 gap-2">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Example Demonstrations</span>
          </label>

          {/* Category Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#152023]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredExamples.map((ex, idx) => {
            const isLocal = ex.category === 'Simple / Local';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChangePrompt(ex.prompt);
                  if (ex.enforceJson !== undefined) {
                    onToggleEnforceJson(ex.enforceJson);
                  }
                }}
                className={`text-xs p-2.5 rounded-xl border text-left transition-all group cursor-pointer ${
                  isLocal
                    ? 'bg-[#101c1e]/70 hover:bg-[#132427] border-emerald-900/50 hover:border-emerald-700/80'
                    : 'bg-[#101c22]/70 hover:bg-[#13252e] border-teal-900/50 hover:border-teal-700/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    {isLocal ? (
                      <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-200 group-hover:text-white">
                      {ex.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isLocal
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-teal-950 text-teal-400'
                    }`}
                  >
                    {ex.category}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1">{ex.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Prompt & Task Workspace
            </span>
            {predictedDecision && prompt.trim() && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                  predictedDecision.route === 'local'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                    : 'bg-teal-950/90 text-teal-300 border-teal-800'
                }`}
              >
                <span>Live Route Prediction:</span>
                <span className="font-bold">
                  {predictedDecision.route === 'local' ? 'Local CPU Engine' : 'Gemma 4 Inference'}
                </span>
                <span className="text-zinc-400 font-mono text-[10px]">(&lt;0.5ms)</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 font-mono">
            {wordCount} words &middot; {charCount} chars
          </div>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a task to route (e.g. 'extract emails from this text...', 'clean whitespace', 'format JSON', 'count words', or ask Gemma 4 to explain/synthesize reasoning)..."
          rows={7}
          className="w-full p-4 text-sm font-mono text-zinc-100 bg-[#070b0c] border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all resize-y shadow-inner placeholder:text-zinc-600 leading-relaxed"
        />

        {/* Realtime Classification Hint */}
        {predictedDecision && prompt.trim() && (
          <div className="mt-2.5 text-xs p-3 rounded-xl bg-[#121b1d] border border-emerald-950/80 text-zinc-300 flex items-start space-x-2.5">
            <div className="mt-0.5 text-emerald-400">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-white">{predictedDecision.ruleName}:</span>{' '}
              <span className="text-zinc-300">{predictedDecision.reason}</span>
              {predictedDecision.matchedPattern && (
                <div className="mt-1 font-mono text-[11px] text-emerald-400/90 bg-[#090f10] border border-emerald-900/40 px-2 py-0.5 rounded inline-block">
                  Pattern: {predictedDecision.matchedPattern}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Options & Action Row */}
      <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle JSON validation */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-zinc-300 select-none hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enforceJson}
              onChange={(e) => onToggleEnforceJson(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
            />
            <span className="font-medium">Enforce Strict JSON Output Schema</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2.5 flex-wrap sm:flex-nowrap">
          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            disabled={isBusy || !prompt}
            className="px-3.5 py-2.5 text-xs font-medium text-zinc-400 hover:text-white border border-zinc-800 hover:bg-[#162124] rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Compare with Baseline */}
          <button
            type="button"
            onClick={onCompare}
            disabled={isBusy || !prompt.trim()}
            className="px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:text-white bg-[#142023] hover:bg-[#1a2b30] border border-emerald-900/60 hover:border-emerald-700 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm cursor-pointer"
            title="Benchmark EcoRoute against direct Gemma 4 model invocation"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>{isComparing ? 'Benchmarking...' : 'Baseline Compare'}</span>
          </button>

          {/* Primary Run Prompt Button */}
          <button
            type="button"
            onClick={() => onExecute('auto')}
            disabled={isBusy || !prompt.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/40 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-pulse' : ''}`} />
            <span className="tracking-wide">{isExecuting ? 'Routing & Executing...' : 'Run Prompt'}</span>
            <span className="hidden sm:inline text-[10px] text-emerald-100 font-mono opacity-80 ml-1">
              Ctrl+Enter
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
