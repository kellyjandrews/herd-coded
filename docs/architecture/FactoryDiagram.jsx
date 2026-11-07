'use client';
/* Factory architecture, drawn with arch-lib.
   Copy your arch-lib/ folder next to this file, then render <FactoryDiagram />. */

import { useState } from "react";
import { Diagram, Layer, Node, Connector, BiConnector, DetailPanel, FlowSelector } from "./arch-lib";

const P = {
  human: "#64748b", agent: "#c084fc", git: "#94a3b8", ci: "#38bdf8",
  ai: "#a78bfa", vercel: "#2dd4bf", data: "#0891b2", infra: "#475569", ok: "#10b981", bad: "#ef4444",
};
const W = { sm: 120, md: 150 };
const H = { node: 56 };

const DETAILS = {
  kickoff: { title: "/kickoff", color: P.human, items: [
    { label: "Asks", value: "Problem, demo moment, time box, team, surface, data & AI, hosting, constraints" },
    { label: "Writes", value: "docs/brief.md → architect writes docs/stack.md with 2 alternative fast paths" },
  ]},
  architect: { title: "architect", color: P.agent, items: [
    { label: "Job", value: "Fastest credible path to a demo: stack, real vs mocked, milestones, backlog" },
  ]},
  planner: { title: "planner", color: P.agent, items: [{ label: "Writes", value: "specs/<slug>/plan.md — Given/When/Then ACs + ≤6 tasks" }]},
  builder: { title: "builder", color: P.agent, items: [{ label: "Rule", value: "App stays runnable after every task; npm run verify each step" }]},
  tester: { title: "tester", color: P.agent, items: [{ label: "Rule", value: "Every AC gets a Vitest or Playwright test; app bugs go back to builder" }]},
  reviewer: { title: "reviewer", color: P.agent, items: [{ label: "Verdict", value: "SHIP or FIX — blocks only demo-breakers, secrets, embarrassments" }]},
  shipper: { title: "shipper", color: P.agent, items: [{ label: "Does", value: "feat/<slug> branch, conventional commits, gh pr create" }]},
  preview: { title: "Preview per PR", color: P.vercel, items: [
    { label: "Workflow", value: "preview.yml — vercel build + deploy, Neon branch, health check, Playwright, sticky PR comment" },
  ]},
  prod: { title: "Production", color: P.vercel, items: [
    { label: "Workflow", value: "production.yml — verify, deploy --prod, smoke test on /api/health SHA, auto-rollback" },
  ]},
};

export default function FactoryDiagram() {
  const [panel, setPanel] = useState(null);
  const open = (id) => () => setPanel(id);
  const d = panel && DETAILS[panel];

  return (
    <>
      <Diagram
        theme="dark" width={1100}
        title="AI Code Factory" subtitle="Feature → plan → build → test → ship → production"
        flows={{
          feature: { nodes: ["featurecmd", "planner", "builder", "tester", "reviewer", "shipper", "gh", "ci", "preview"], color: P.agent, label: "Local feature" },
          release: { nodes: ["gh", "ci", "prod", "smoke", "rollback"], color: P.ok, label: "Merge → prod" },
          issue: { nodes: ["issue", "remote-copilot", "gh", "ci", "preview", "review"], color: P.ai, label: "Issue → Copilot → PR" },
        }}
      >
        <FlowSelector position="inline" />

        <Layer label="Human" color={P.human}>
          <Node id="kickoff" label="/kickoff" sublabel="interview" color={P.human} width={W.md} height={H.node} onClick={open("kickoff")} />
          <Node id="featurecmd" label="/feature" sublabel="local" color={P.human} width={W.md} height={H.node} />
          <Node id="issue" label="Feature issue" sublabel="from dashboard" color={P.human} width={W.md} height={H.node} />
          <Node id="demo" label="/demo" sublabel="script + seed" color={P.human} width={W.md} height={H.node} />
        </Layer>

        <Layer label="Agents · Copilot" color={P.agent}>
          <Node id="remote-copilot" label="Copilot agent" sublabel="remote, opens PR" color={P.agent} width={W.sm} height={H.node} />
          <Node id="architect" label="architect" sublabel="stack.md" color={P.agent} width={W.sm} height={H.node} onClick={open("architect")} />
          <Node id="planner" label="planner" sublabel="plan.md" color={P.agent} width={W.sm} height={H.node} onClick={open("planner")} />
          <Node id="builder" label="builder" sublabel="code" color={P.agent} width={W.sm} height={H.node} onClick={open("builder")} />
          <Node id="tester" label="tester" sublabel="tests" color={P.agent} width={W.sm} height={H.node} onClick={open("tester")} />
          <Node id="reviewer" label="reviewer" sublabel="SHIP/FIX" color={P.agent} width={W.sm} height={H.node} onClick={open("reviewer")} />
          <Node id="shipper" label="shipper" sublabel="PR" color={P.agent} width={W.sm} height={H.node} onClick={open("shipper")} />
          <Node id="coach" label="demo-coach" sublabel="demo.md" color={P.agent} width={W.sm} height={H.node} />
        </Layer>

        <Layer label="GitHub" color={P.ci}>
          <Node id="gh" label="Pull request" sublabel="feat/<slug>" color={P.git} width={W.md} height={H.node} />
          <Node id="ci" label="CI · verify" sublabel="lint, types, unit, build" color={P.ci} width={W.md} height={H.node} />
          <Node id="review" label="Review gate" sublabel="SHIP / FIX" color={P.ai} width={W.md} height={H.node} />
        </Layer>

        <Layer label="Vercel" color={P.vercel}>
          <Node id="preview" label="Preview" sublabel="URL per PR + e2e" color={P.vercel} width={W.md} height={H.node} onClick={open("preview")} badge="new" />
          <Node id="prod" label="Production" sublabel="on merge to main" color={P.vercel} width={W.md} height={H.node} onClick={open("prod")} />
          <Node id="smoke" label="Smoke test" sublabel="/api/health SHA" color={P.ok} width={W.md} height={H.node} />
          <Node id="rollback" label="Auto-rollback" sublabel="previous prod" color={P.bad} width={W.md} height={H.node} />
        </Layer>

        <Layer label="Secrets & data" color={P.infra} compact>
          <Node id="vercel-env" label="Vercel env" sublabel="app runtime secrets" color={P.vercel} width={W.md} />
          <Node id="github-secrets" label="GitHub Actions" sublabel="workflow secrets + vars" color={P.infra} width={W.md} />
          <Node id="neon" label="Neon (optional)" sublabel="DB branch per PR" color={P.data} width={W.md} />
        </Layer>

        <Connector from="kickoff" to="architect" label="brief.md" />
        <Connector from="featurecmd" to="planner" />
        <Connector from="planner" to="builder" side="right-left" />
        <Connector from="builder" to="tester" side="right-left" />
        <BiConnector from="tester" to="reviewer" side="right-left" labelReverse="FIX" spread={7} />
        <Connector from="reviewer" to="shipper" side="right-left" label="SHIP" labelDy={-12} />
        <Connector from="shipper" to="gh" />
        <Connector from="issue" to="remote-copilot" dashed label="assigned" />
        <Connector from="remote-copilot" to="gh" dashed side="left-right" />
        <Connector from="gh" to="ci" side="right-left" />
        <Connector from="ci" to="preview" />
        <Connector from="gh" to="review" dashed />
        <Connector from="ci" to="prod" label="merge to main" labelDx={40} />
        <Connector from="prod" to="smoke" side="right-left" />
        <Connector from="smoke" to="rollback" side="right-left" label="fail" color={P.bad} labelDy={-12} />
        <Connector from="neon" to="preview" dashed />
      </Diagram>

      {d && <DetailPanel nodeId={panel} title={d.title} color={d.color} items={d.items} onClose={() => setPanel(null)} />}
    </>
  );
}
