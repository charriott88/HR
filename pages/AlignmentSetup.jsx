import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";

export default function AlignmentSetup() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({
    core_intent: "",
    movement_principle_1: "",
    movement_principle_2: "",
    movement_principle_3: "",
    camera_rule: "",
    direction_rule: "",
    styling_rule: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [proj, alignments] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }),
        base44.entities.AlignmentRecord.filter({ project_id: projectId }, "-version", 1),
      ]);
      setProject(proj[0]);
      if (alignments[0]) {
        setExisting(alignments[0]);
        setForm({
          core_intent: alignments[0].core_intent || "",
          movement_principle_1: alignments[0].movement_principle_1 || "",
          movement_principle_2: alignments[0].movement_principle_2 || "",
          movement_principle_3: alignments[0].movement_principle_3 || "",
          camera_rule: alignments[0].camera_rule || "",
          direction_rule: alignments[0].direction_rule || "",
          styling_rule: alignments[0].styling_rule || "",
        });
      }
    }
    load();
  }, [projectId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.core_intent) return;
    setSaving(true);
    try {
      const newVersion = existing ? (existing.version || 1) + 1 : 1;
      await base44.entities.AlignmentRecord.create({ ...form, project_id: projectId, version: newVersion, updated_by: '' });
      await base44.entities.Project.update(projectId, { alignment_complete: true });
      navigate(`/projects/${projectId}`);
    } catch (e) {
      console.error("Failed to save alignment", e);
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        {project && <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>}
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Alignment</h1>
        </div>
      </div>

      <div className="bg-secondary/50 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">This defines the shared foundation of the project. It stays visible to all collaborators and guides every decision.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Core intent *</label>
          <p className="text-xs text-muted-foreground mt-0.5 italic">&ldquo;What must this piece hold throughout?&rdquo;</p>
          <textarea
            value={form.core_intent}
            onChange={e => set("core_intent", e.target.value)}
            placeholder="e.g. The piece must hold tension between surrender and control."
            rows={3}
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Movement principles (max 3)</label>
          <p className="text-xs text-muted-foreground mt-0.5 italic">Short rule-based phrases describing how bodies behave</p>
          <div className="mt-2 space-y-2">
            <input value={form.movement_principle_1} onChange={e => set("movement_principle_1", e.target.value)} placeholder="Principle 1" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
            <input value={form.movement_principle_2} onChange={e => set("movement_principle_2", e.target.value)} placeholder="Principle 2" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
            <input value={form.movement_principle_3} onChange={e => set("movement_principle_3", e.target.value)} placeholder="Principle 3" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Translation rules</label>
          <p className="text-xs text-muted-foreground mt-0.5 italic">How alignment translates across disciplines</p>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1 ml-1">Camera</p>
              <input value={form.camera_rule} onChange={e => set("camera_rule", e.target.value)} placeholder="How should movement be captured?" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 ml-1">Direction</p>
              <input value={form.direction_rule} onChange={e => set("direction_rule", e.target.value)} placeholder="Performance tone / intensity" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 ml-1">Styling</p>
              <input value={form.styling_rule} onChange={e => set("styling_rule", e.target.value)} placeholder="How costume / environment affects movement" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !form.core_intent}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 min-h-[44px]"
      >
        {saving ? "Saving…" : existing ? "Update alignment" : "Save alignment"}
      </button>
    </div>
  );
}