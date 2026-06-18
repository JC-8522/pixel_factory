import type { TokenUsage } from "../../shared/types/agent";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const estimateTokenUsage = (input: string, output = ""): TokenUsage => {
  const inputTokens = Math.max(1, Math.ceil(input.length / 4));
  const outputTokens = Math.max(1, Math.ceil(output.length / 4));
  const totalTokens = inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost: Number((totalTokens * 0.00001).toFixed(6)),
    costCurrency: "USD",
    usageSource: "estimated"
  };
};

export const parseTokenUsageFromLine = (line: string): TokenUsage | null => {
  const trimmed = line.trim();

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const usage = typeof parsed.usage === "object" && parsed.usage ? (parsed.usage as Record<string, unknown>) : parsed;
    const inputTokens = toNumber(usage.input_tokens ?? usage.inputTokens ?? usage.prompt_tokens);
    const outputTokens = toNumber(usage.output_tokens ?? usage.outputTokens ?? usage.completion_tokens);
    const totalTokens = toNumber(usage.total_tokens ?? usage.totalTokens);

    if (inputTokens !== null || outputTokens !== null || totalTokens !== null) {
      const input = inputTokens ?? 0;
      const output = outputTokens ?? 0;
      return {
        inputTokens: input,
        outputTokens: output,
        totalTokens: totalTokens ?? input + output,
        cachedTokens: toNumber(usage.cached_tokens ?? usage.cachedTokens) ?? undefined,
        reasoningTokens: toNumber(usage.reasoning_tokens ?? usage.reasoningTokens) ?? undefined,
        estimatedCost: toNumber(usage.estimated_cost ?? usage.estimatedCost),
        costCurrency: typeof usage.cost_currency === "string" ? usage.cost_currency : "USD",
        usageSource: "reported"
      };
    }
  } catch {
    // Fall through to regex parsing.
  }

  const inputMatch = /\b(?:input|prompt)[_-]?tokens[=:]\s*(\d+)/i.exec(line);
  const outputMatch = /\b(?:output|completion)[_-]?tokens[=:]\s*(\d+)/i.exec(line);
  const totalMatch = /\btotal[_-]?tokens[=:]\s*(\d+)/i.exec(line);

  if (!inputMatch && !outputMatch && !totalMatch) {
    return null;
  }

  const inputTokens = inputMatch ? Number(inputMatch[1]) : 0;
  const outputTokens = outputMatch ? Number(outputMatch[1]) : 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens: totalMatch ? Number(totalMatch[1]) : inputTokens + outputTokens,
    costCurrency: "USD",
    usageSource: "reported"
  };
};
