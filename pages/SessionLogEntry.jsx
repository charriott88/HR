import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";

const PHASES = ["R&D", "Development", "Rehearsal", "Pre-shoot", "Shoot", "Post-production / Performance"];
const PROMPTS = ["What shifted?", "What held?", "What surprised you?", "What needs more time?", "What is the body saying?", "What are you noticing?"];

export default function SessionLogEntry() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [threads, setThreads] = useState([]);
  const [form, setForm] = useState({ phase: "", prompt: "What shifted?", text_entry: "", energy_clarity_score: 0, tagged_collaborators: [], thread_ids: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [projs, collabs, thrds] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }),
        base44.entities.ProjectCollaborator.filter({ project_id: projectId }),
        base44.entities.Thread.filter({ project_id: projectId }),
      ]);
      const proj = projs[0];
      setProject(proj);
      setCollaborators(collabs);
      setThreads(thrds);
      if (proj?.current_phase) setForm(f => ({ ...f, phase: proj.current_phase }));
    }
    load();
  }, [projectId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleArray = (k, val) => setForm(f => ({
    ...f,
    [k]: f[k].includes(val) ? f[k].filter(x => x !== val) : [...f[k], val]
  }));

  const handleSave = async () => {
    if (!form.text_entry.trim()) return;
    setSaving(true);
    const me = await base44.auth.me();
    await base44.entities.SessionLog.create({
      ...form,
      project_id: projectId,
      author_id: me.id,
      author_name: me.full_name,
      author_role: me.role || "",
      energy_clarity_score: form.energy_clarity_score || undefined,
    });
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Log session</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* Prompt */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prompt</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROMPTS.map(p => (
              <button key={p} onClick={() => set("prompt", p)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors min-h-[44px] ${form.prompt === p ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/40"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Text entry */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{form.prompt}</label>
          <textarea
            value={form.text_entry}
            onChange={e => set("text_entry", e.target.value)}
            placeholder="Write your observation, shift, or note…"
            rows={5}
            autoFocus
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm resize-none"
          />
        </div>

        {/* Phase */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phase</label>
          <div className="mt-2 flex flex-col gap-1.5">
            {PHASES.map(ph => (
              <button key={ph} onClick={() => set("phase", ph)} className={`px-3 py-2.5 rounded-lg text-sm border text-left transition-colors min-h-[44px] ${form.phase === ph ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/40"}`}>
                {ph}
              </button>
            ))}
          </div>
        </div>

        {/* Energy score */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Energy / clarity</label>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => set("energy_clarity_score", form.energy_clarity_score === n ? 0 : n)} className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors ${form.energy_clarity_score >= n ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-foreground/40"}`}>
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 ml-1">1 = low · 5 = high</p>
        </div>

        {/* Tag collaborators */}
        {collaborators.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tag collaborators</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {collaborators.map(c => (
                <button key={c.id} onClick={() => toggleArray("tagged_collaborators", c.id)} className={`px-3 py-2 rounded-lg text-xs border transition-colors min-h-[44px] ${form.tagged_collaborators.includes(c.id) ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                  {c.user_name || c.user_email} · {c.assigned_role}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Link to threads */}
        {threads.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Link to thread</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {threads.map(t => (
                <button key={t.id} onClick={() => toggleArray("thread_ids", t.id)} className={`px-3 py-2 rounded-lg text-xs border transition-colors min-h-[44px] ${form.thread_ids.includes(t.id) ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !form.text_entry.trim()}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 min-h-[44px]"
      >
        {saving ? "Saving…" : "Save log"}
      </button>
    </div>
  );
}