import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { classifyRequest, executeLocalTask, ExecutionResult } from './src/lib/router.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Target Gemma 4 model ID requested by user
const TARGET_GEMMA_MODEL = process.env.GEMMA_MODEL_ID?.trim() || 'gemma-4-26b-a4b-it';

// Known pricing reference for open-weights inference (per 1M tokens)
// Standard rate reference: $0.10 / 1M prompt, $0.40 / 1M output (or $0.00 for local CPU)
const PRICING_PER_1M_INPUT = 0.10;
const PRICING_PER_1M_OUTPUT = 0.40;

/**
 * Cache available models to minimize latency on status checks
 */
let cachedModels: { models: string[]; checkedAt: number } | null = null;

async function getAvailableModelsList(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedModels && now - cachedModels.checkedAt < 300000) {
    return cachedModels.models;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const listRes = await ai.models.list();
    const modelNames: string[] = [];
    for await (const m of listRes) {
      if (m.name) modelNames.push(m.name);
    }
    cachedModels = { models: modelNames, checkedAt: now };
    return modelNames;
  } catch (err) {
    console.warn('[EcoRoute Lite] Could not list models:', err);
    return [];
  }
}

/**
 * Endpoint to check backend & Google Gen AI SDK status
 */
app.get('/api/status', async (req: Request, res: Response) => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const isGeminiConfigured = Boolean(geminiKey);

  let gemmaAvailable = false;
  let availableGemmaModels: string[] = [];

  if (isGeminiConfigured) {
    const allModels = await getAvailableModelsList(geminiKey);
    const targetWithPrefix = TARGET_GEMMA_MODEL.startsWith('models/')
      ? TARGET_GEMMA_MODEL
      : `models/${TARGET_GEMMA_MODEL}`;

    gemmaAvailable = allModels.some(
      (m) => m === targetWithPrefix || m === TARGET_GEMMA_MODEL || m.includes(TARGET_GEMMA_MODEL)
    );
    availableGemmaModels = allModels.filter((m) => m.toLowerCase().includes('gemma'));
  }

  res.json({
    localEngineReady: true,
    geminiConfigured: isGeminiConfigured,
    gemmaModel: TARGET_GEMMA_MODEL,
    gemmaModelAvailable: gemmaAvailable,
    provider: 'Google Gen AI SDK (@google/genai)',
    availableGemmaModels,
  });
});

/**
 * Helper to call Gemma 4 model via Google Gen AI SDK
 */
async function callGemmaViaGoogleSDK(prompt: string, enforceJson: boolean, isRetry: boolean) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      status: 'missing_key' as const,
      error: 'Google Gemini API key is missing in server environment secrets.',
      setupInstructions: {
        message: 'Local deterministic processing works 100% offline without any API key. To enable Gemma 4 model inference, configure GEMINI_API_KEY in server secrets.',
        requiredEnvVars: ['GEMINI_API_KEY', 'GEMMA_MODEL_ID'],
      },
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = TARGET_GEMMA_MODEL;

  try {
    const systemInstruction = enforceJson
      ? `You are Gemma 4 (${modelId}), an open-weights AI model. The user specifically requires valid JSON output. Output strictly valid, parseable JSON with NO markdown code fences or conversational prose.${isRetry ? ' Note: The previous response had invalid JSON. Please ensure 100% strict JSON syntax.' : ''}`
      : `You are Gemma 4 (${modelId}), a high-performance open-weights AI model developed by Google DeepMind. Provide direct, concise, and accurate answers.`;

    const contents = enforceJson
      ? `${systemInstruction}\n\nUser Task: ${prompt}\n\nRespond ONLY with strict JSON:`
      : prompt;

    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: {
        systemInstruction: !enforceJson ? systemInstruction : undefined,
      },
    });

    const content = response.text || '';
    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount || 0;
    const completionTokens = usage?.candidatesTokenCount || 0;
    const totalTokens = usage?.totalTokenCount || (promptTokens + completionTokens);

    const cost = (promptTokens * PRICING_PER_1M_INPUT + completionTokens * PRICING_PER_1M_OUTPUT) / 1000000;

    return {
      status: 'success' as const,
      output: content,
      tokensUsed: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      estimatedCostUsd: Number(cost.toFixed(6)),
      modelId,
    };
  } catch (err: any) {
    let readableError = err.message || 'Gemma 4 model inference failed';
    try {
      const parsed = JSON.parse(readableError);
      if (parsed?.error?.message) {
        readableError = parsed.error.message;
      }
    } catch {
      // keep readableError
    }

    // Check if model not found or unavailable
    const isModelNotFound =
      readableError.includes('not found') ||
      readableError.includes('404') ||
      readableError.includes('NOT_FOUND') ||
      readableError.includes('unsupported') ||
      readableError.includes('permission');

    // Fetch available models so the user sees exactly what their key has access to
    const availableModels = await getAvailableModelsList(apiKey);
    const gemmaModels = availableModels.filter((m) => m.toLowerCase().includes('gemma'));

    return {
      status: 'model_unavailable' as const,
      modelId,
      error: isModelNotFound
        ? `Gemma 4 model '${modelId}' is currently not accessible with your API key.`
        : readableError,
      rawError: readableError,
      availableGemmaModels: gemmaModels,
      allAvailableModelsCount: availableModels.length,
      help: `Do not substitute another model silently or fabricate responses. To configure a supported model, set GEMMA_MODEL_ID in server environment secrets or .env. Available Gemma models found for your key: ${gemmaModels.length > 0 ? gemmaModels.join(', ') : 'None listed'}.`,
    };
  }
}

/**
 * Execute a task with smart routing
 */
app.post('/api/execute', async (req: Request, res: Response) => {
  const startTime = performance.now();
  const { prompt, forceRoute = 'auto', enforceJson = false, isRetry = false } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "prompt" parameter' });
  }

  // 1. Determine Route
  const routing = classifyRequest(prompt);
  const targetRoute = forceRoute === 'auto' ? routing.route : forceRoute === 'local' ? 'local' : 'gemma-4';

  // 2. Handle Local Deterministic Execution
  if (targetRoute === 'local') {
    const ruleIdToUse = routing.route === 'local' ? routing.ruleId : 'LOCAL_CLEAN_WHITESPACE';
    const localRes = executeLocalTask(ruleIdToUse, prompt);
    const elapsedMs = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));

    const result: ExecutionResult = {
      output: localRes.output,
      route: 'local',
      ruleId: routing.ruleId,
      ruleName: routing.ruleName,
      reason: routing.reason,
      matchedPattern: routing.matchedPattern,
      elapsedMs,
      modelCall: false,
      tokensUsed: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      estimatedCostUsd: 0,
      isValidJson: localRes.isValidJson,
      jsonValidationError: localRes.jsonValidationError,
      retryAvailable: false,
    };

    return res.json({
      status: 'success',
      result,
    });
  }

  // 3. Handle Gemma 4 Model Execution via Google Gen AI SDK
  const modelRes = await callGemmaViaGoogleSDK(prompt, enforceJson, isRetry);

  if (modelRes.status === 'missing_key') {
    const elapsedMs = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));
    return res.status(503).json({
      status: 'endpoint_missing',
      error: modelRes.error,
      route: 'gemma-4',
      ruleId: routing.ruleId,
      ruleName: routing.ruleName,
      reason: routing.reason,
      elapsedMs,
      setupInstructions: modelRes.setupInstructions,
    });
  }

  if (modelRes.status === 'model_unavailable') {
    const elapsedMs = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));
    return res.status(502).json({
      status: 'model_unavailable',
      error: modelRes.error,
      modelId: modelRes.modelId,
      availableGemmaModels: modelRes.availableGemmaModels,
      help: modelRes.help,
      route: 'gemma-4',
      ruleId: routing.ruleId,
      ruleName: routing.ruleName,
      reason: routing.reason,
      elapsedMs,
    });
  }

  const elapsedMs = Number((performance.now() - startTime).toFixed(1));

  // Validate JSON output if requested or looks like JSON
  let isValidJson = true;
  let jsonValidationError: string | undefined;
  let finalOutput = modelRes.output;

  if (enforceJson || prompt.toLowerCase().includes('json')) {
    try {
      let clean = modelRes.output.trim();
      // Strip markdown code fences if model enclosed them
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      JSON.parse(clean);
      isValidJson = true;
      finalOutput = clean;
    } catch (jsonErr: any) {
      isValidJson = false;
      jsonValidationError = jsonErr.message;
    }
  }

  const result: ExecutionResult = {
    output: finalOutput,
    route: 'gemma-4',
    ruleId: routing.ruleId,
    ruleName: `Gemma 4 (${modelRes.modelId})`,
    reason: forceRoute === 'gemma'
      ? `Forced Gemma 4 (${modelRes.modelId}) inference (Baseline Comparison Mode).`
      : routing.reason,
    matchedPattern: routing.matchedPattern,
    elapsedMs,
    modelCall: true,
    tokensUsed: modelRes.tokensUsed,
    estimatedCostUsd: modelRes.estimatedCostUsd,
    isValidJson,
    jsonValidationError,
    retryAvailable: !isValidJson && !isRetry,
    modelId: modelRes.modelId,
  };

  return res.json({
    status: 'success',
    result,
  });
});

/**
 * Baseline comparison: Runs the task through EcoRoute AND directly through Gemma 4,
 * comparing latency, token consumption, and compute offload.
 */
app.post('/api/compare', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const routing = classifyRequest(prompt);

  // 1. Run EcoRoute
  const ecoStart = performance.now();
  let ecoResult: ExecutionResult;
  if (routing.route === 'local') {
    const localRes = executeLocalTask(routing.ruleId, prompt);
    const ecoElapsed = Math.max(0.1, Number((performance.now() - ecoStart).toFixed(2)));
    ecoResult = {
      output: localRes.output,
      route: 'local',
      ruleId: routing.ruleId,
      ruleName: routing.ruleName,
      reason: routing.reason,
      elapsedMs: ecoElapsed,
      modelCall: false,
      tokensUsed: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      estimatedCostUsd: 0,
      isValidJson: localRes.isValidJson,
    };
  } else {
    // Both would use Gemma 4
    const modelRes = await callGemmaViaGoogleSDK(prompt, false, false);
    const ecoElapsed = Number((performance.now() - ecoStart).toFixed(1));
    if (modelRes.status !== 'success') {
      return res.status(503).json({
        status: 'model_unavailable',
        error: modelRes.error,
        help: (modelRes as any).help || 'Gemma 4 model call failed.',
      });
    }
    ecoResult = {
      output: modelRes.output,
      route: 'gemma-4',
      ruleId: routing.ruleId,
      ruleName: `Gemma 4 (${modelRes.modelId})`,
      reason: routing.reason,
      elapsedMs: ecoElapsed,
      modelCall: true,
      tokensUsed: modelRes.tokensUsed,
      estimatedCostUsd: modelRes.estimatedCostUsd,
      modelId: modelRes.modelId,
    };
  }

  // 2. Run Baseline (Forced Gemma 4)
  const baseStart = performance.now();
  const baseModelRes = await callGemmaViaGoogleSDK(prompt, false, false);
  const baseElapsed = Number((performance.now() - baseStart).toFixed(1));

  if (baseModelRes.status !== 'success') {
    return res.json({
      status: 'partial',
      ecoRoute: ecoResult,
      baselineError: baseModelRes.error,
      disclaimer: 'Measurements are experimental. Real CPU compute was used for EcoRoute.',
    });
  }

  const baselineResult: ExecutionResult = {
    output: baseModelRes.output,
    route: 'gemma-4',
    ruleId: 'BASELINE_FORCE_GEMMA',
    ruleName: `Un-routed Gemma 4 (${baseModelRes.modelId})`,
    reason: 'Standard direct LLM invocation without smart deterministic routing.',
    elapsedMs: baseElapsed,
    modelCall: true,
    tokensUsed: baseModelRes.tokensUsed,
    estimatedCostUsd: baseModelRes.estimatedCostUsd,
    modelId: baseModelRes.modelId,
  };

  const latencySavedMs = Math.max(0, baselineResult.elapsedMs - ecoResult.elapsedMs);
  const latencyReductionPercent = baselineResult.elapsedMs > 0
    ? Number(((latencySavedMs / baselineResult.elapsedMs) * 100).toFixed(1))
    : 0;

  const tokensSaved = Math.max(0, baselineResult.tokensUsed.totalTokens - ecoResult.tokensUsed.totalTokens);
  const tokenReductionPercent = baselineResult.tokensUsed.totalTokens > 0
    ? Number(((tokensSaved / baselineResult.tokensUsed.totalTokens) * 100).toFixed(1))
    : 0;

  res.json({
    status: 'success',
    ecoRoute: ecoResult,
    baseline: baselineResult,
    comparison: {
      latencySavedMs,
      latencyReductionPercent,
      tokensSaved,
      tokenReductionPercent,
      isLocalOffload: ecoResult.route === 'local',
      factualComputeSummary: ecoResult.route === 'local'
        ? `Deterministic CPU offload avoided 100% of LLM tokens (${tokensSaved} tokens) and reduced latency by ${latencyReductionPercent}%.`
        : `Task required neural reasoning; both routes executed Gemma 4 (${TARGET_GEMMA_MODEL}).`,
      disclaimer: 'Measurements are experimental based on this specific request. Energy/carbon savings depend on cloud provider PUE and hardware specs and are not fabricated.',
    },
  });
});

// Mount Vite middleware in development or static in production
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[EcoRoute Lite] Server running on http://0.0.0.0:${PORT} (Target Model: ${TARGET_GEMMA_MODEL})`);
});
