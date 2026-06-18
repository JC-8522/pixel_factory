import type { ReactElement } from "react";
import type { PermissionRequestRecord } from "../../shared/ipc";

type PermissionDecisionDialogProps = {
  request: PermissionRequestRecord;
  busy: boolean;
  onClose(): void;
  onDecide(decision: "allow_once" | "allow_project" | "deny"): Promise<void>;
};

export function PermissionDecisionDialog({
  request,
  busy,
  onClose,
  onDecide
}: PermissionDecisionDialogProps): ReactElement {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel permission-dialog" aria-label="Permission request">
        <header className="dialog-header">
          <div>
            <p className="eyebrow">Permission Policy</p>
            <h3>Review Risky Command</h3>
          </div>
          <button
            aria-label="Close permission dialog"
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className="permission-risk-banner">
          <strong>{request.riskKinds.join(", ")}</strong>
          <span>{request.projectPath}</span>
        </div>

        <section className="permission-block">
          <h4>Command</h4>
          <pre>{request.redactedCommand}</pre>
        </section>

        <section className="permission-block">
          <h4>Why It Needs Review</h4>
          <ul className="plain-list">
            {request.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <footer className="dialog-actions">
          <button disabled={busy} onClick={() => void onDecide("deny")} type="button">
            Deny
          </button>
          <button disabled={busy} onClick={() => void onDecide("allow_once")} type="button">
            Allow Once
          </button>
          <button className="primary-action" disabled={busy} onClick={() => void onDecide("allow_project")} type="button">
            Always Allow In Project
          </button>
        </footer>
      </section>
    </div>
  );
}
