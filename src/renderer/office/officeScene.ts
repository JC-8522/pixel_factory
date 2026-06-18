import { Graphics, Text } from "pixi.js";
import type { Application, Container } from "pixi.js";
import type { AgentRecord } from "../../shared/types/records";
import { createAgentSprite } from "./agentSprites";
import { officeZones } from "./officeLayout";

export type RenderOfficeSceneInput = {
  app: Application;
  agents: AgentRecord[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onMoveAgent: (agentId: string, x: number, y: number) => void;
};

const drawZones = (stage: Container): void => {
  for (const zone of officeZones) {
    const zoneShape = new Graphics()
      .roundRect(zone.x, zone.y, zone.width, zone.height, 8)
      .fill({ color: zone.color, alpha: 0.95 })
      .stroke({ color: 0x6f7d8c, width: 1, alpha: 0.5 });
    const label = new Text({
      text: zone.label,
      style: { fill: 0xd7e0ea, fontFamily: "Arial", fontSize: 13 }
    });
    label.x = zone.x + 12;
    label.y = zone.y + 10;
    stage.addChild(zoneShape, label);
  }
};

export const renderOfficeScene = ({
  app,
  agents,
  selectedAgentId,
  onSelectAgent,
  onMoveAgent
}: RenderOfficeSceneInput): void => {
  app.stage.removeChildren();

  const background = new Graphics().rect(0, 0, 780, 500).fill(0x151b21);
  app.stage.addChild(background);
  drawZones(app.stage);

  for (const agent of agents) {
    app.stage.addChild(createAgentSprite(agent, agent.id === selectedAgentId, onSelectAgent, onMoveAgent));
  }
};
