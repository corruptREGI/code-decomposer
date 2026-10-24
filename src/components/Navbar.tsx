import React from 'react';
import { Leaf, Cpu, Zap, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { ServerStatus } from '../types.ts';

interface NavbarProps {
  serverStatus: ServerStatus | null;
  onOpenSetup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ serverStatus, onOpenSetup }) => {
  return (
    <header className="border-b border-emerald-950/60 bg-[#0c1214]/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Leaf icon */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/30">
            <Leaf className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg text-white tracking-tight flex items-center">
                EcoRoute <span className="text-emerald-400 ml-1">Lite</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
                Gemma 4 Edition
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Intelligent inference router &middot; Sub-millisecond CPU + Google Gen AI SDK
            </p>
          </div>
        </div>

        {/* Status Indicators & Setup Button */}
        <div className="flex items-center space-x-2.5">
          {/* Local CPU Engine Status */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-zinc-300 bg-[#121a1d] px-2.5 py-1.5 rounded-lg border border-emerald-900/40">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400 font-medium">Local CPU:</span>
            <span className="text-emerald-400 font-semibold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse"></span>
              Active (0ms)
            </span>
          </div>

          {/* Model Status */}
          <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-[#121a1d] border-zinc-800">
            {serverStatus?.geminiConfigured && serverStatus?.gemmaModelAvailable ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-zinc-400 font-medium">Model:</span>
                <span className="text-emerald-400 font-medium font-mono truncate max-w-[140px]">
                  {serverStatus.gemmaModel}
                </span>
              </>
            ) : serverStatus?.geminiConfigured ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline text-zinc-400 font-medium">GenAI SDK:</span>
                <span className="text-teal-400 font-medium">Ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-zinc-400 font-medium">Gemini Key:</span>
                <span className="text-amber-400">Unconfigured</span>
              </>
            )}
          </div>

          {/* Config Drawer Button */}
          <button
            onClick={onOpenSetup}
            className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-[#141f22] hover:bg-[#1a282c] border border-emerald-900/50 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
            title="Configure Google Gen AI SDK & Model Secrets"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Model & Secrets</span>
          </button>
        </div>
      </div>
    </header>
  );
};
