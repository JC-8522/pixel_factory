import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { AgentPackInspection } from "../../shared/ipc";
import { useAgentPackStore } from "../stores/agentPackStore";
import { useProfileStore } from "../stores/profileStore";

const defaultSamplePath = "C:\\Users\\Administrator\\Desktop\\repo\\pixel_factory\\fixtures\\agent-packs\\founder-engineering-pack";

const readList = (manifest: AgentPackInspection["manifest"], key: string): unknown[] => {
  const value = manifest?.[key];
  return Array.isArray(value) ? value : [];
};

const readName = (item: unknown): string => {
  if (typeof item !== "object" || item === null || Array.isArray(item)) return "Unnamed";
  const record = item as Record<string, unknown>;
  return typeof record.name === "string" ? record.name : typeof record.id === "string" ? record.id : "Unnamed";
};

const JsonPreview = ({ value }: { value: unknown }): ReactElement => (
  <pre className="json-preview">{JSON.stringify(value, null, 2)}</pre>
);

export function AgentPackReview(): ReactElement {
  const [folderPath, setFolderPath] = useState(defaultSamplePath);
  const { installedPacks, inspection, installResult, loading, error, hydrate, inspect, install, uninstall } = useAgentPackStore();
  const { profiles, hydrate: hydrateProfiles } = useProfileStore();

  useEffect(() => {
    void hydrate();
    void hydrateProfiles();
  }, [hydrate, hydrateProfiles]);

  const installedProfileNames = useMemo(() => {
    const installedIds = new Set(installResult?.installedProfileIds ?? []);
    return profiles.filter((profile) => installedIds.has(profile.id)).map((profile) => profile.name);
  }, [installResult, profiles]);

  const canInstall = inspection?.validationStatus === "valid" || inspection?.validationStatus === "warning";

  const onInspect = async (): Promise<void> => {
    await inspect(folderPath);
  };

  const onInstall = async (): Promise<void> => {
    await install(folderPath);
    await hydrateProfiles();
  };

  return (
    <section className="agent-pack-workspace">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Ecosystem / extensibility</p>
          <h2>Agent Pack Review</h2>
        </div>
      </header>

      <section className="pack-inspect-panel">
        <label>
          Local Agent Pack folder
          <input
            aria-label="Local Agent Pack folder"
            value={folderPath}
            onChange={(event) => setFolderPath(event.target.value)}
          />
        </label>
        <div className="pack-actions">
          <button onClick={() => void onInspect()} type="button" disabled={loading}>Inspect Pack</button>
          <button onClick={() => void onInstall()} type="button" disabled={loading || !canInstall}>Install Reviewed Pack</button>
        </div>
        <p className="pack-note">Inspection reads manifest files only. Declared scripts are listed for review and are not executed.</p>
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <div className="agent-pack-grid">
        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Inspection</h3>
            <span>{inspection?.validationStatus ?? "not inspected"}</span>
          </div>

          {inspection ? (
            <div className="pack-review-list">
              <dl className="compact-facts">
                <div>
                  <dt>Name</dt>
                  <dd>{inspection.summary.name ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Author</dt>
                  <dd>{inspection.summary.author ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Scripts</dt>
                  <dd>{inspection.summary.scripts} not executed</dd>
                </div>
                <div>
                  <dt>Checksum</dt>
                  <dd>{inspection.checksum?.slice(0, 12) ?? "None"}</dd>
                </div>
                <div>
                  <dt>Signature</dt>
                  <dd>{inspection.signatureStatus}</dd>
                </div>
                <div>
                  <dt>Permissions</dt>
                  <dd>{inspection.permissionReview.status}</dd>
                </div>
              </dl>

              {inspection.validationErrors.length > 0 ? (
                <div className="validation-box error">
                  <strong>Validation errors</strong>
                  {inspection.validationErrors.map((item) => <p key={item}>{item}</p>)}
                </div>
              ) : null}

              {inspection.validationWarnings.length > 0 ? (
                <div className="validation-box warning">
                  <strong>Validation warnings</strong>
                  {inspection.validationWarnings.map((item) => <p key={item}>{item}</p>)}
                </div>
              ) : null}

              <h4>Permission Manifest</h4>
              <JsonPreview value={inspection.permissionReview.manifest} />
            </div>
          ) : (
            <p className="empty-note">Enter a local pack folder and inspect it before installing.</p>
          )}
        </section>

        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Included Content</h3>
            <span>{inspection ? `${inspection.summary.profiles} profiles` : "waiting"}</span>
          </div>
          {inspection?.manifest ? (
            <div className="pack-review-list">
              <h4>Agent Profiles</h4>
              {readList(inspection.manifest, "profiles").map((profile) => (
                <article className="pack-item" key={readName(profile)}>
                  <strong>{readName(profile)}</strong>
                  <span>{typeof profile === "object" && profile !== null && "role" in profile ? String((profile as { role?: unknown }).role) : "role missing"}</span>
                </article>
              ))}

              <h4>Bundled Skills</h4>
              {readList(inspection.manifest, "bundledSkills").map((skill) => (
                <article className="pack-item" key={readName(skill)}>
                  <strong>{readName(skill)}</strong>
                  <span>{typeof skill === "object" && skill !== null && "path" in skill ? String((skill as { path?: unknown }).path) : "path missing"}</span>
                </article>
              ))}

              <h4>Skill Dependencies</h4>
              {readList(inspection.manifest, "skillDependencies").map((skill) => (
                <article className="pack-item" key={readName(skill)}>
                  <strong>{readName(skill)}</strong>
                </article>
              ))}

              <h4>Workflow Templates</h4>
              {readList(inspection.manifest, "workflowTemplates").map((workflow) => (
                <article className="pack-item" key={readName(workflow)}>
                  <strong>{readName(workflow)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-note">No valid manifest content loaded yet.</p>
          )}
        </section>

        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Installed Packs</h3>
            <span>{installedPacks.length}</span>
          </div>
          <div className="pack-review-list">
            {installedPacks.length === 0 ? <p className="empty-note">No packs installed.</p> : null}
            {installedPacks.map((pack) => (
              <article className="pack-item" key={pack.id}>
                <strong>{pack.name}</strong>
                <span>{pack.author ?? "Unknown author"} · {pack.validation_status ?? "unknown"}</span>
                <button onClick={() => void uninstall(pack.id)} type="button" disabled={loading}>Uninstall</button>
              </article>
            ))}
          </div>

          {installResult ? (
            <div className="validation-box success">
              <strong>Installed profiles visible in Profile Library</strong>
              {(installedProfileNames.length > 0 ? installedProfileNames : installResult.installedProfileIds).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
