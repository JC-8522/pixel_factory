import type { CodexOfficeApi } from "../shared/ipc";

declare global {
  interface Window {
    codexOffice: CodexOfficeApi;
  }
}

export {};
