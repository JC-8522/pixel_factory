const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const assertRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
};

export const assertNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
};

export const optionalString = (value: unknown, label: string): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return assertNonEmptyString(value, label);
};

export const optionalNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }

  return value;
};

export const optionalJsonValue = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  JSON.stringify(value);
  return value;
};

export const assertStringEnum = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${label} must be one of: ${values.join(", ")}`);
  }

  return value as T;
};

