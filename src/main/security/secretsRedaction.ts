const secretPatterns: Array<[RegExp, string]> = [
  [/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY))=([^\s]+)/gi, "$1=[REDACTED]"],
  [/(--token\s+)(\S+)/gi, "$1[REDACTED]"],
  [/(--password\s+)(\S+)/gi, "$1[REDACTED]"],
  [/(authorization:\s*bearer\s+)(\S+)/gi, "$1[REDACTED]"],
  [/(api[_-]?key[=:]\s*)(\S+)/gi, "$1[REDACTED]"]
];

export const redactSensitiveText = (text: string): string =>
  secretPatterns.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
