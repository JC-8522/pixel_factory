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

const addLabel = (stage: Container, text: string, x: number, y: number, size = 13): void => {
  const label = new Text({
    text,
    style: { fill: 0xf5f0e6, fontFamily: "monospace", fontSize: size, fontWeight: "700" }
  });
  label.x = x;
  label.y = y;
  stage.addChild(label);
};

const drawRoom = (stage: Container): void => {
  const frame = new Graphics()
    .roundRect(8, 8, 764, 484, 12)
    .fill(0x6b4a34)
    .stroke({ color: 0x2b1d16, width: 4 });
  const wall = new Graphics().rect(18, 18, 744, 178).fill(0xe7d7bf);
  const floor = new Graphics().rect(18, 196, 744, 278).fill(0x8790a1);
  stage.addChild(frame, wall, floor);

  const floorTiles = new Graphics();
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      const tint = (row + col) % 2 === 0 ? 0x8d97a8 : 0x7f8899;
      floorTiles.rect(18 + col * 62, 196 + row * 40, 62, 40).fill({ color: tint, alpha: 0.52 });
    }
  }
  stage.addChild(floorTiles);

  const trim = new Graphics().rect(18, 184, 744, 12).fill(0x76604f);
  const ceilingBeam = new Graphics().rect(18, 18, 744, 12).fill(0x8c6850);
  stage.addChild(trim, ceilingBeam);
};

const drawDecor = (stage: Container): void => {
  const doorFrame = new Graphics()
    .roundRect(340, 58, 100, 94, 6)
    .fill(0x4d392c)
    .stroke({ color: 0x2d211a, width: 3 });
  const doorLeft = new Graphics().roundRect(350, 68, 38, 74, 4).fill(0x26282c);
  const doorRight = new Graphics().roundRect(392, 68, 38, 74, 4).fill(0x26282c);
  const handles = new Graphics()
    .circle(386, 104, 3)
    .fill(0xd8c27f)
    .circle(394, 104, 3)
    .fill(0xd8c27f);
  stage.addChild(doorFrame, doorLeft, doorRight, handles);

  const sofa = new Graphics()
    .roundRect(520, 106, 92, 44, 8)
    .fill(0x3d5f93)
    .stroke({ color: 0x253b5a, width: 3 });
  const chair = new Graphics()
    .roundRect(620, 126, 36, 34, 6)
    .fill(0xbd8530)
    .stroke({ color: 0x7b531a, width: 3 });
  const table = new Graphics().roundRect(560, 158, 42, 16, 5).fill(0x6b4a34);
  stage.addChild(sofa, chair, table);

  const shelf = new Graphics()
    .roundRect(70, 78, 110, 82, 5)
    .fill(0x7d5538)
    .stroke({ color: 0x4b311f, width: 3 });
  const shelfBooks = new Graphics();
  for (let index = 0; index < 6; index += 1) {
    shelfBooks.rect(80 + index * 16, 118, 10, 20).fill([0x3b658f, 0x5a8640, 0xc08b2f, 0xa75039, 0x5f4b8b, 0x2d6f6a][index]);
  }
  stage.addChild(shelf, shelfBooks);

  const rug = new Graphics().roundRect(186, 250, 408, 160, 10).fill({ color: 0x718099, alpha: 0.24 });
  const workstationSpots = new Graphics();
  for (const zone of officeZones) {
    workstationSpots
      .roundRect(zone.x, zone.y, zone.width, zone.height, 10)
      .fill({ color: 0xcaa26a, alpha: 0.14 })
      .stroke({ color: 0x5d4a35, width: 2, alpha: 0.32 });
  }
  stage.addChild(rug, workstationSpots);

  const plants = [
    { x: 280, y: 160 },
    { x: 486, y: 160 },
    { x: 662, y: 158 },
    { x: 112, y: 430 }
  ];
  for (const plant of plants) {
    const pot = new Graphics().roundRect(plant.x, plant.y, 18, 18, 4).fill(0x8d5b31);
    const leaves = new Graphics()
      .ellipse(plant.x + 9, plant.y - 6, 8, 16)
      .fill(0x5a8a3d)
      .ellipse(plant.x + 3, plant.y - 2, 6, 14)
      .fill(0x6da34c)
      .ellipse(plant.x + 15, plant.y - 2, 6, 14)
      .fill(0x6da34c);
    stage.addChild(pot, leaves);
  }

  addLabel(stage, "PIXEL OFFICE", 40, 40, 18);
  addLabel(stage, "SHIP  REVIEW  DEPLOY", 530, 42, 12);
};

const drawZones = (stage: Container): void => {
  for (const zone of officeZones) {
    const zoneShape = new Graphics()
      .roundRect(zone.x, zone.y, zone.width, zone.height, 8)
      .fill({ color: zone.color, alpha: 0.08 })
      .stroke({ color: 0xefe1c6, width: 1, alpha: 0.18 });
    stage.addChild(zoneShape);
    addLabel(stage, zone.label, zone.x + 14, zone.y + 10, 12);
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

  const background = new Graphics().rect(0, 0, 780, 500).fill(0x2b221d);
  app.stage.addChild(background);
  drawRoom(app.stage);
  drawDecor(app.stage);
  drawZones(app.stage);

  for (const agent of agents) {
    app.stage.addChild(createAgentSprite(agent, agent.id === selectedAgentId, onSelectAgent, onMoveAgent));
  }
};
