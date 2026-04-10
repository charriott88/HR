import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Sparkles, Plus, Trash2, ChevronDown, ChevronUp, Pencil, Save, Crosshair } from "lucide-react";
import OrientationBadge from "../components/OrientationBadge";

export default function ShotListView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [shots, setShots] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editingShot, setEditingShot] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newShot, setNewShot] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    const [projs, alignments, treatments, allShots] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.AlignmentRecord.filter({ project_id: projectId }, "-version", 1),
      base44.entities.Treatment.filter({ project_id: projectId }, "-version", 1),
      base44.entities.Shot.filter({ project_id: projectId }, "order", 100),
    ]);
    setProject(projs[0]);
    setAlignment(alignments[0]);
    setTreatment(treatments[0] || null);
    setShots(allShots);
    setLoading(false);
  }

  const orientation = project?.orientation || "structured";

  const buildGeneratePrompt = () => {
    const a = alignment;
    const t = treatment;
    const principles = a ? [a.movement_principle_1, a.movement_principle_2, a.movement_principle_3].filter(Boolean).join("; ") : "";
    const treatmentSummary = t
      ? Object.entries(t).filter(([k, v]) => v && !["id", "project_id", "orientation", "version", "created_by", "created_date", "updated_date"].includes(k)).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";

    const langRules = `
LANGUAGE RULES for shot descriptions:
- Each shot must read as a decision, not a description.
- Movement: define what the body is doing and why — not "dancers move" but "Dancer A initiates floor descent — weight resists full release"
- Roles: clearly assign initiator, responder, focal point.
- Camera: define how the camera supports movement — not "camera follows" but "camera holds static — movement crosses frame without pursuit"
- Avoid: "two dancers interact", "explores tension", "dynamic energy"
- Use: "Dancer A initiates — B delays response, focus remains on A"
`;

    if (orientation === "structured") {
      return `Generate a structured shot list for "${project?.title}" (${project?.project_type}).
Core intent: "${a?.core_intent}". Movement principles: ${principles}.
Camera rule: ${a?.camera_rule}. Direction tone: ${a?.direction_rule}.
Treatment summary:\n${treatmentSummary}

${langRules}

Generate 8–12 shots. Return JSON: { "shots": [ { "shot_id": "S01", "what_happens": "...", "movement_intention": "...", "camera_action": "...", "spatial_logic": "...", "framing": "...", "protagonists": ["Dancer A", "Dancer B"], "roles": "Dancer A: initiator. Dancer B: responder. Focus: A." } ] }
shot_id format: S01, S02, etc.`;
    } else {
      return `Generate an open / artist-led moment list for "${project?.title}" (${project?.project_type}).
Core intent: "${a?.core_intent}". Movement principles: ${principles}.
Treatment summary:\n${treatmentSummary}

${langRules}

These are "Moments", not prescriptive shots. Maintain openness while clarifying direction.
Generate 8–12 moments. Return JSON: { "shots": [ { "shot_id": "M01", "what_happens": "...", "what_exploring": "...", "body_relationship": "...", "camera_interpretation": "...", "protagonists": ["Performer A"], "roles": "Performer A: focal subject. Space: active participant." } ] }
shot_id format: M01, M02, etc.`;
    }
  };

  const generate = async () => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildGeneratePrompt(),
      response_json_schema: {
        type: "object",
        properties: {
          shots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                shot_id: { type: "string" },
                what_happens: { type: "string" },
                movement_intention: { type: "string" },
                camera_action: { type: "string" },
                spatial_logic: { type: "string" },
                framing: { type: "string" },
                what_exploring: { type: "string" },
                body_relationship: { type: "string" },
                camera_interpretation: { type: "string" },
                protagonists: { type: "array", items: { type: "string" } },
                roles: { type: "string" },
              },
            },
          },
        },
      },
    });

    const me = await base44.auth.me();
    const toCreate = (result.shots || []).map((s, i) => ({
      ...s,
      project_id: projectId,
      treatment_id: treatment?.id || "",
      orientation,
      order: i,
    }));

    await base44.entities.Shot.bulkCreate(toCreate);
    setGenerating(false);
    load();
  };

  const deleteShot = async (id) => {
    await base44.entities.Shot.delete(id);
    setShots(prev => prev.filter(s => s.id !== id));
  };

  const saveEditingShot = async () => {
    await base44.entities.Shot.update(editingShot.id, editingShot);
    setShots(prev => prev.map(s => s.id === editingShot.id ? editingShot : s));
    setEditingShot(null);
  };

  const handleAddNew = async () => {
    const order = shots.length;
    const shot_id = orientation === "structured" ? `S${String(order + 1).padStart(2, "0")}` : `M${String(order + 1).padStart(2, "0")}`;
    const created = await base44.entities.Shot.create({
      ...newShot,
      shot_id,
      project_id: projectId,
      treatment_id: treatment?.id || "",
      orientation,
      order,
    });
    setShots(prev => [...prev, created]);
    setNewShot({});
    setAddingNew(false);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  const isOpen = orientation === "open";
  const label = isOpen ? "Moment" : "Shot";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">{isOpen ? "Moments" : "Shot List"}</h1>
        </div>
        <OrientationBadge orientation={orientation} />
      </div>

      <div className="bg-secondary/50 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {isOpen
            ? "What is happening — what is being explored — how bodies relate. Each moment is a possibility, not an instruction."
            : "Each shot is a decision. Movement intention, camera action, and role clarity defined before execution."}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px]"
        >
          {generating ? (
            <><div className="w-3 h-3 border border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" /> Generating…</>
          ) : (
            <><Sparkles size={13} /> Generate {shots.length > 0 ? "new list" : label.toLowerCase() + " list"}</>
          )}
        </button>
        {shots.length > 0 && (
          <Link
            to={`/projects/${projectId}/shoot`}
            className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted min-h-[44px]"
          >
            <Crosshair size={13} /> Shoot mode
          </Link>
        )}
        <button onClick={() => setAddingNew(true)} className="p-2.5 border border-border rounded-xl hover:bg-secondary min-h-[44px]">
          <Plus size={16} />
        </button>
      </div>

      {addingNew && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New {label}</p>
          {isOpen ? (
            <>
              <textarea rows={2} placeholder="What is happening" value={newShot.what_happens || ""} onChange={e => setNewShot(s => ({ ...s, what_happens: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
              <textarea rows={2} placeholder="What is being explored" value={newShot.what_exploring || ""} onChange={e => setNewShot(s => ({ ...s, what_exploring: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
              <textarea rows={2} placeholder="Relationship between bodies" value={newShot.body_relationship || ""} onChange={e => setNewShot(s => ({ ...s, body_relationship: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
            </>
          ) : (
            <>
              <textarea rows={2} placeholder="What happens" value={newShot.what_happens || ""} onChange={e => setNewShot(s => ({ ...s, what_happens: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
              <textarea rows={2} placeholder="Movement intention" value={newShot.movement_intention || ""} onChange={e => setNewShot(s => ({ ...s, movement_intention: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
              <textarea rows={2} placeholder="Camera action" value={newShot.camera_action || ""} onChange={e => setNewShot(s => ({ ...s, camera_action: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
            </>
          )}
          <input placeholder="Protagonists (comma separated)" value={(newShot.protagonists || []).join(", ")} onChange={e => setNewShot(s => ({ ...s, protagonists: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <input placeholder="Roles (initiator, responder, focal subject…)" value={newShot.roles || ""} onChange={e => setNewShot(s => ({ ...s, roles: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={handleAddNew} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium min-h-[44px]">Add {label}</button>
            <button onClick={() => setAddingNew(false)} className="px-4 border border-border rounded-xl text-sm hover:bg-secondary min-h-[44px]">Cancel</button>
          </div>
        </div>
      )}

      {shots.length === 0 && !generating && !addingNew && (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No {label.toLowerCase()}s yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Generate from your treatment and alignment, or add manually.</p>
        </div>
      )}

      <div className="space-y-2">
        {shots.map(shot => (
          <div key={shot.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
              onClick={() => setExpandedId(expandedId === shot.id ? null : shot.id)}
            >
              <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">{shot.shot_id}</span>
              <p className="text-sm text-foreground flex-1 line-clamp-1">{shot.what_happens}</p>
              {expandedId === shot.id ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
            </button>

            {expandedId === shot.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                {editingShot?.id === shot.id ? (
                  <ShotEditor shot={editingShot} onChange={setEditingShot} orientation={orientation} onSave={saveEditingShot} onCancel={() => setEditingShot(null)} />
                ) : (
                  <>
                    <ShotDetail shot={shot} orientation={orientation} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingShot({ ...shot })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px]"><Pencil size={12} /> Edit</button>
                      <button onClick={() => deleteShot(shot.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive min-h-[44px] ml-2"><Trash2 size={12} /> Delete</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShotDetail({ shot, orientation }) {
  const isOpen = orientation === "open";
  const rows = isOpen
    ? [
        { label: "What is happening", value: shot.what_happens },
        { label: "What is being explored", value: shot.what_exploring },
        { label: "Relationship between bodies", value: shot.body_relationship },
        { label: "Camera interpretation", value: shot.camera_interpretation },
        { label: "Protagonists", value: (shot.protagonists || []).join(", ") },
        { label: "Roles", value: shot.roles },
      ]
    : [
        { label: "What happens", value: shot.what_happens },
        { label: "Movement intention", value: shot.movement_intention },
        { label: "Camera action", value: shot.camera_action },
        { label: "Spatial logic", value: shot.spatial_logic },
        { label: "Framing", value: shot.framing },
        { label: "Protagonists", value: (shot.protagonists || []).join(", ") },
        { label: "Roles", value: shot.roles },
      ];

  return (
    <div className="space-y-2">
      {rows.filter(r => r.value).map(r => (
        <div key={r.label}>
          <p className="text-xs text-muted-foreground">{r.label}</p>
          <p className="text-sm text-foreground leading-relaxed">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function ShotEditor({ shot, onChange, orientation, onSave, onCancel }) {
  const set = (k, v) => onChange(s => ({ ...s, [k]: v }));
  const isOpen = orientation === "open";

  const fields = isOpen
    ? [
        { key: "what_happens", label: "What is happening" },
        { key: "what_exploring", label: "What is being explored" },
        { key: "body_relationship", label: "Relationship between bodies" },
        { key: "camera_interpretation", label: "Camera interpretation (optional)" },
      ]
    : [
        { key: "what_happens", label: "What happens" },
        { key: "movement_intention", label: "Movement intention" },
        { key: "camera_action", label: "Camera action" },
        { key: "spatial_logic", label: "Spatial logic" },
        { key: "framing", label: "Framing" },
      ];

  return (
    <div className="space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
          <textarea
            value={shot[f.key] || ""}
            onChange={e => set(f.key, e.target.value)}
            rows={2}
            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-foreground/50"
          />
        </div>
      ))}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Protagonists (comma separated)</p>
        <input value={(shot.protagonists || []).join(", ")} onChange={e => set("protagonists", e.target.value.split(",").map(x => x.trim()).filter(Boolean))} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/50" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Roles</p>
        <input value={shot.roles || ""} onChange={e => set("roles", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/50" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Notes</p>
        <textarea value={shot.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-foreground/50" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-1 text-xs text-foreground font-medium hover:opacity-70 min-h-[44px]"><Save size={12} /> Save</button>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] ml-2">Cancel</button>
      </div>
    </div>
  );
}