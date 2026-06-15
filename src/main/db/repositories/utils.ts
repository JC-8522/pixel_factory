import type { SqlValue } from "../client";

export const nowIso = (): string => new Date().toISOString();

export const jsonStringify = (value: unknown, fallback: string): string => {
  if (value === undefined) {
    return fallback;
  }

  return JSON.stringify(value);
};

export const nullable = (value: string | number | null | undefined): SqlValue => value ?? null;

export const boolToInt = (value: boolean): number => (value ? 1 : 0);

export const intToBool = (value: unknown): boolean => Number(value) === 1;

