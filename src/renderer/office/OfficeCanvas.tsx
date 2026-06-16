import { Application } from "pixi.js";
import { useEffect, useRef, type ReactElement } from "react";
import type { AgentRecord } from "../../shared/types/records";
import { renderOfficeScene } from "./officeScene";

type OfficeCanvasProps = {
  agents: AgentRecord[];
  selectedAgentId: string | null;
  onSelectAgent(agentId: string): void;
  onMoveAgent(agentId: string, x: number, y: number): void;
};

export function OfficeCanvas({ agents, selectedAgentId, onSelectAgent, onMoveAgent }: OfficeCanvasProps): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    let destroyed = false;
    const app = new Application();
    appRef.current = app;

    void app.init({ width: 780, height: 500, backgroundAlpha: 0, antialias: false }).then(() => {
      if (destroyed || !hostRef.current) {
        app.destroy();
        return;
      }

      hostRef.current.replaceChildren(app.canvas);
      app.canvas.className = "office-canvas-element";
      renderOfficeScene({ app, agents, selectedAgentId, onSelectAgent, onMoveAgent });
    });

    return () => {
      destroyed = true;
      app.destroy();
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app) {
      return;
    }

    renderOfficeScene({ app, agents, selectedAgentId, onSelectAgent, onMoveAgent });
  }, [agents, selectedAgentId, onSelectAgent, onMoveAgent]);

  return <div className="office-canvas-host" ref={hostRef} />;
}
