import React, { useState } from 'react';
import { X, Server, Key, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Terminal, Cpu, Zap, Leaf } from 'lucide-react';
import { ServerStatus } from '../types.ts';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverStatus: ServerStatus | null;
  onRefreshStatus: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  serverStatus,
  onRefreshStatus,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1618] rounded-2xl max-w-xl w-full border border-emerald-900/60 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-[#121c1e] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Google Gen AI SDK & Model Architecture
              </h3>
              <p className="text-xs text-zinc-400">
                Gemma 4 ({serverStatus?.gemmaModel || 'gemma-4-26b-a4b-it'}) & Local Engine Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-zinc-300 max-h-[75vh] overflow-y-auto">
          {/* Current Live Status Card */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-[#111a1c]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-300">
                Live Runtime Status
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium cursor-pointer"
                title="Ping server status"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Local Engine */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-medium text-zinc-300">Local Deterministic Engine:</span>
                </div>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Operational (0 tokens, no key needed)</span>
                </span>
              </div>

              {/* Gemini API Key */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-300">Google Gemini API Key:</span>
                </div>
                {serverStatus?.geminiConfigured ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Injected via Server Secrets</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Missing (Required for model inference)</span>
                  </span>
                )}
              </div>

              {/* Target Gemma 4 Model */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <Zap className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-medium text-zinc-300">Target Model ID:</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">
                  {serverStatus?.gemmaModel || 'gemma-4-26b-a4b-it'}
                </span>
              </div>

              {/* Model Verification */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-400">Model Verification:</span>
                {serverStatus?.gemmaModelAvailable ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified on Google Gen AI SDK</span>
                  </span>
                ) : (
                  <span className="text-zinc-400">Checked at runtime</span>
                )}
              </div>
            </div>
          </div>

          {/* Model Availability & No-Silent-Substitution Policy */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Strict Model Integrity Policy</span>
            </h4>
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 leading-relaxed">
              <strong>No Silent Substitutions:</strong> If <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-emerald-300">{serverStatus?.gemmaModel || 'gemma-4-26b-a4b-it'}</code> is ever unavailable or unsupported for your API key, EcoRoute Lite will display a clear error explaining how to configure a supported model. It will <strong>never silently substitute another model or fabricate AI responses</strong>.
            </div>
          </div>

          {/* Available Gemma Models on Account */}
          {serverStatus?.availableGemmaModels && serverStatus.availableGemmaModels.length > 0 && (
            <div className="space-y-2">
              <span className="font-semibold text-zinc-300">
                Gemma Models Available on Your Key:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {serverStatus.availableGemmaModels.map((m) => (
                  <span
                    key={m}
                    className="font-mono text-[11px] bg-[#142023] text-emerald-300 border border-emerald-900/60 px-2 py-0.5 rounded"
                  >
                    {m.replace('models/', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* How to configure Gemma Model ID */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <span>Server-Side Environment Secrets</span>
            </h4>
            <p className="text-zinc-400">
              Configure in Google AI Studio's server-side secrets or <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-zinc-300">.env</code>:
            </p>

            <div className="bg-[#05090a] text-zinc-300 p-4 rounded-xl font-mono text-[11px] space-y-1.5 border border-zinc-800 overflow-x-auto shadow-inner">
              <div className="text-zinc-500"># Google Gemini API Key (Server-side only)</div>
              <div className="text-emerald-400">GEMINI_API_KEY="AIzaSy..."</div>
              <div className="mt-2 text-zinc-500"># Gemma 4 Model ID (Defaults to gemma-4-26b-a4b-it)</div>
              <div className="text-emerald-400">GEMMA_MODEL_ID="gemma-4-26b-a4b-it"</div>
            </div>
          </div>

          {/* Offline / Local Note */}
          <div className="p-3.5 bg-[#121c1e] border border-zinc-800 rounded-xl text-zinc-400 flex items-start space-x-2.5">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-zinc-200">Deterministic Local Engine is 100% Offline:</strong> Regex email extraction, lexical word counts, whitespace cleaning, CSV parsing, and JSON syntax formatting execute locally on CPU with zero tokens and zero API dependency.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-[#121c1e] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">EcoRoute Lite &middot; Google Gen AI SDK</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
