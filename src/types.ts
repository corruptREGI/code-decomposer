export interface RoutingDecision {
  route: 'local' | 'gemma-4';
  ruleId: string;
  ruleName: string;
  confidence: number;
  reason: string;
  matchedPattern?: string;
  estimatedComplexity: 'O(1)' | 'O(n)' | 'O(n log n)' | 'O(LLM Attention)';
}

export interface ExecutionResult {
  output: string;
  route: 'local' | 'gemma-4';
  ruleId: string;
  ruleName: string;
  reason: string;
  matchedPattern?: string;
  elapsedMs: number;
  modelCall: boolean;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCostUsd: number;
  isValidJson?: boolean;
  jsonValidationError?: string;
  retryAvailable?: boolean;
  modelId?: string;
}

export interface ComparisonResult {
  status: 'success' | 'partial';
  ecoRoute: ExecutionResult;
  baseline?: ExecutionResult;
  baselineError?: string;
  comparison?: {
    latencySavedMs: number;
    latencyReductionPercent: number;
    tokensSaved: number;
    tokenReductionPercent: number;
    isLocalOffload: boolean;
    factualComputeSummary: string;
    disclaimer: string;
  };
}

export interface ServerStatus {
  localEngineReady: boolean;
  geminiConfigured: boolean;
  gemmaModel: string;
  gemmaModelAvailable: boolean;
  provider: string;
  availableGemmaModels?: string[];
}

export interface SessionMetrics {
  totalRequests: number;
  localRequests: number;
  modelRequests: number;
  totalTokensUsed: number;
  totalTokensAvoided: number;
  totalCostUsd: number;
  totalCostAvoidedUsd: number;
  localLatencies: number[];
  modelLatencies: number[];
}
