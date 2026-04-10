import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";

const PHASES = ["R&D", "Development", "Rehearsal", "Pre-shoot", "Shoot", "Post-production / Performance"];
const TYPES = ["Stage Performance", "Music Video", "Fashion / Brand Film", "Short Film", "Hybrid"];
const CONTEXTS = ["Commissioned / Commercial", "Funded", "Self-initiated"];
const OUTCOMES = ["Live performance", "Film / video", "Hybrid"];

export default function NewProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", project_type: "", context: "", intended_outcome: "", current_phase: "", orientation: "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.project_type) return;
    setSaving(true);
    try {
      const proj = await base44.entities.Project.create({ ...form, owner_id: 'local-user', status: "active", alignment_complete: false });
      navigate(`/projects/${proj.id}/alignment`);
    } catch (e) {
      console.error("Failed to create project", e);
      setSaving(false);
    }
  };

  const Pill = ({ value, selected, onClick }) => (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm border transition-colors min-h-[44px] text-left ${selected ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/40"}`}>
      {value}
    </button>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <h1 className="font-serif text-2xl text-foreground">New project</h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project title *</label>
          <input
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder="e.g. Between Bodies"
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project type *</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TYPES.map(t => <Pill key={t} value={t} selected={form.project_type === t} onClick={() => set("project_type", t)} />)}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Context</label>
          <div className="mt-2 flex flex-col gap-2">
            {CONTEXTS.map(c => <Pill key={c} value={c} selected={form.context === c} onClick={() => set("context", c)} />)}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intended outcome</label>
          <div className="mt-2 flex flex-col gap-2">
            {OUTCOMES.map(o => <Pill key={o} value={o} selected={form.intended_outcome === o} onClick={() => set("intended_outcome", o)} />)}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current phase</label>
          <div className="mt-2 flex flex-col gap-2">
            {PHASES.map(ph => <Pill key={ph} value={ph} selected={form.current_phase === ph} onClick={() => set("current_phase", ph)} />)}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workflow orientation *</label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">What approach best fits how you want this to be realised?</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => set("orientation", "structured")}
              className={`px-4 py-3 rounded-xl border text-left transition-colors min-h-[44px] ${form.orientation === "structured" ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/40"}`}
            >
              <p className="text-sm font-medium">A — Structured / Production-led</p>
              <p className={`text-xs mt-0.5 ${form.orientation === "structured" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Clear decisions, production-ready, built for execution</p>
            </button>
            <button
              onClick={() => set("orientation", "open")}
              className={`px-4 py-3 rounded-xl border text-left transition-colors min-h-[44px] ${form.orientation === "open" ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/40"}`}
            >
              <p className="text-sm font-medium">B — Open / Artist-led</p>
              <p className={`text-xs mt-0.5 ${form.orientation === "open" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Exploratory, evolving, built for discovery</p>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || !form.title || !form.project_type || !form.orientation}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 min-h-[44px]"
      >
        {saving ? "Creating…" : "Create project → Set alignment"}
      </button>
    </div>
  );
}