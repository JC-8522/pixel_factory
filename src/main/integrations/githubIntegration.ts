export type GitHubIntegrationBoundary = {
  status: "not_configured" | "ready" | "error";
  reason: string;
  createPullRequest?: (input: {
    owner: string;
    repo: string;
    base: string;
    head: string;
    title: string;
    body: string;
  }) => Promise<{ url: string }>;
};

export const disabledGitHubIntegration = (): GitHubIntegrationBoundary => ({
  status: "not_configured",
  reason: "GitHub PR integration is a V2 boundary; no authenticated provider is configured in the desktop app yet."
});
