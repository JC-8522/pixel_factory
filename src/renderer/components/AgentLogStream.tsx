import { useEffect, type ReactElement } from "react";
import { useEventStore } from "../stores/eventStore";

type AgentLogStreamProps = {
  agentId: string;
};

export function AgentLogStream({ agentId }: AgentLogStreamProps): ReactElement {
  const { events, hydrate } = useEventStore();

  useEffect(() => {
    void hydrate({ agentId });
  }, [agentId, hydrate]);

  const logEvents = events.filter((event) =>
    ["log_line", "command_started", "command_completed", "error_occurred", "file_touched"].includes(event.type)
  );

  if (logEvents.length === 0) {
    return <p className="empty-note">No runtime logs yet.</p>;
  }

  return (
    <div className="log-stream">
      {logEvents.slice(-8).map((event) => {
        const payload = JSON.parse(event.payload_json) as { line?: string; command?: string; message?: string };
        return (
          <div className="log-line" data-severity={event.severity} key={event.id}>
            <span>{event.type}</span>
            <code>{payload.line ?? payload.command ?? payload.message ?? event.created_at}</code>
          </div>
        );
      })}
    </div>
  );
}
