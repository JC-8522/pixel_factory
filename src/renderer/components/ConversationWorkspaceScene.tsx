import { Component, type ErrorInfo, type ReactElement, type ReactNode } from "react";
import type { AgentRecord } from "../../shared/types/records";
import { AgentConversationWorkspace } from "./AgentConversationWorkspace";

type ConversationWorkspaceBoundaryProps = {
  children: ReactNode;
  onReset(): void;
};

type ConversationWorkspaceBoundaryState = {
  error: Error | null;
};

class ConversationWorkspaceBoundary extends Component<
  ConversationWorkspaceBoundaryProps,
  ConversationWorkspaceBoundaryState
> {
  state: ConversationWorkspaceBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ConversationWorkspaceBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Conversation workspace crashed", error, info);
  }

  componentDidUpdate(prevProps: ConversationWorkspaceBoundaryProps): void {
    if (this.state.error && prevProps.children !== this.props.children) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <section aria-label="Conversation workspace error" className="conversation-workspace-shell">
        <header className="conversation-workspace-header" data-minimal="false">
          <div className="conversation-workspace-title">
            <div>
              <p className="conversation-workspace-kicker">Workspace error</p>
              <h2>Conversation workspace could not open</h2>
              <div className="conversation-workspace-meta">
                <span>{this.state.error.name || "Error"}</span>
              </div>
            </div>
          </div>
          <div className="conversation-workspace-actions">
            <button className="conversation-ghost-button" onClick={this.props.onReset} type="button">
              Office
            </button>
          </div>
        </header>
        <section className="conversation-run-shell">
          <article className="conversation-run-thread" data-active="true" data-attention="failure">
            <div className="conversation-run-main-flow">
              <div className="conversation-run-overview-copy">
                <strong>{this.state.error.message || "Unknown renderer error."}</strong>
                <span>React caught the workspace render failure before the whole renderer could disappear.</span>
              </div>
              {this.state.error.stack ? (
                <pre className="conversation-code-block">
                  <code>{this.state.error.stack}</code>
                </pre>
              ) : null}
            </div>
          </article>
        </section>
      </section>
    );
  }
}

type ConversationWorkspaceSceneProps = {
  agent: AgentRecord;
  onClose(): void;
  onDelete(agentId: string): Promise<void>;
};

export function ConversationWorkspaceScene({
  agent,
  onClose,
  onDelete
}: ConversationWorkspaceSceneProps): ReactElement {
  return (
    <section aria-label="Conversation scene" className="workspace conversation-focus-workspace">
      <ConversationWorkspaceBoundary key={agent.id} onReset={onClose}>
        <AgentConversationWorkspace agent={agent} onClose={onClose} onDelete={onDelete} />
      </ConversationWorkspaceBoundary>
    </section>
  );
}
