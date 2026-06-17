import { Container, Graphics, Text } from "pixi.js";
import type { AgentRecord } from "../../shared/types/records";
import { statusColor } from "./officeLayout";

export const createAgentSprite = (
  agent: AgentRecord,
  selected: boolean,
  onSelect: (agentId: string) => void,
  onMove: (agentId: string, x: number, y: number) => void
): Container => {
  const container = new Container();
  container.x = agent.position_x || 90;
  container.y = agent.position_y || 260;
  container.eventMode = "static";
  container.cursor = "pointer";

  const shadow = new Graphics().ellipse(0, 35, 24, 7).fill({ color: 0x000000, alpha: 0.24 });
  const head = new Graphics().rect(-12, -30, 24, 22).fill(statusColor(agent.status)).stroke({ color: 0x111820, width: 2 });
  const body = new Graphics().rect(-15, -8, 30, 34).fill(0xf5f0e7).stroke({ color: 0x111820, width: 2 });
  const legs = new Graphics()
    .rect(-13, 25, 9, 12)
    .rect(4, 25, 9, 12)
    .fill(0x2f4053)
    .stroke({ color: 0x111820, width: 2 });
  const marker = new Graphics()
    .circle(17, -25, 6)
    .fill(statusColor(agent.status))
    .stroke({ color: selected ? 0xffffff : 0x111820, width: selected ? 3 : 1 });
  const label = new Text({
    text: agent.name,
    style: {
      fill: 0xf7f7f2,
      fontFamily: "Arial",
      fontSize: 12,
      align: "center"
    }
  });
  label.anchor.set(0.5, 0);
  label.y = 42;

  const outline = new Graphics();
  if (selected) {
    outline.roundRect(-26, -38, 52, 88, 6).stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
  }

  container.addChild(shadow, outline, legs, body, head, marker, label);

  let dragging = false;
  container.on("pointerdown", () => {
    dragging = true;
    onSelect(agent.id);
  });
  container.on("pointerup", () => {
    dragging = false;
    onMove(agent.id, Math.round(container.x), Math.round(container.y));
  });
  container.on("pointerupoutside", () => {
    dragging = false;
    onMove(agent.id, Math.round(container.x), Math.round(container.y));
  });
  container.on("pointermove", (event) => {
    if (!dragging || !container.parent) {
      return;
    }

    const point = event.getLocalPosition(container.parent);
    container.x = Math.max(35, Math.min(735, point.x));
    container.y = Math.max(70, Math.min(430, point.y));
  });

  return container;
};
