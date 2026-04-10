import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const PROMPTS = ["What shifted?", "What held?", "What surprised you?", "What needs more time?", "What is the body saying?", "What are you noticing?"];

export default function PromptDetail() {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({ prompt: "What shifted?", text_entry: "", energy_clarity_score: 0 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => { load(); }, [promptId]);

  async function load() {
    const [prompts, allLogs] = await Promise.all([
      base44.entities.PromptCall.filter({ id: promptId }),
      base44.entities.SessionLog.filter({ prompt_id: promptId }, "-created_date"),
    ]);
    setPrompt(prompts[0]);
    setLogs(allLogs);
    setLoading(false);
  }

  const saveLog = async () => {
    if (!logForm.text_entry.trim()) return;
    setSaving(true);
    const me = await base44.auth.me();
    await base44.entities.SessionLog.create({
      ...logForm,
      prompt_id: promptId,
      author_id: me.id,
      author_name: me.full_name,
      author_role: me.role || "",
      energy_clarity_score: logForm.energy_clarity_score || undefined,
    });
    setLogForm({ prompt: "What shifted?", text_entry: "", energy_clarity_score: 0 });
    setShowLog(false);
    setSaving(false);
    load();
  };

  const convertToProject = async () => {
    setConverting(true);
    const me = await base44.auth.me();
    const proj = await base44.entities.Project.create({
      title: prompt.title,
      project_type: "Stage Performance",
      context: "Self-initiated",
      status: "active",
      alignment_complete: false,
      owner_id: me.id,
    });
    await base44.entities.PromptCall.update(promptId, { status: "converted", converted_project_id: proj.id });
    navigate(`/projects/${proj.id}/alignment`);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;
  if (!prompt) return <div className="text-muted-foreground text-sm">Prompt not found.</div>;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/prompts" className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Prompt</p>
          <h1 className="font-serif text-xl text-foreground leading-tight">{prompt.title}</h1>
        </div>
      </div>

      {prompt.intent && (
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Intent</p>
          <p className="text-sm text-foreground">{prompt.intent}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setShowLog(!showLog)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]">
          <Plus size={14} /> Log session
        </button>
        {prompt.status === "active" && (
          <button onClick={convertToProject} disabled={converting} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors min-h-[44px] disabled:opacity-50">
            <ArrowRight size={14} /> {converting ? "Converting…" : "Make project"}
          </button>
        )}
      </div>

      {showLog && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PROMPTS.map(p => (
              <button key={p} onClick={() => setLogForm(f => ({ ...f, prompt: p }))} className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${logForm.prompt === p ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>{p}</button>
            ))}
          </div>
          <textarea
            value={logForm.text_entry}
            onChange={e => setLogForm(f => ({ ...f, text_entry: e.target.value }))}
            placeholder={logForm.prompt}
            rows={4}
            autoFocus
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm resize-none"
          />
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setLogForm(f => ({ ...f, energy_clarity_score: f.energy_clarity_score === n ? 0 : n }))} className={`flex-1 h-10 rounded-lg border text-xs font-medium transition-colors ${logForm.energy_clarity_score >= n ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{n}</button>
            ))}
          </div>
          <button onClick={saveLog} disabled={saving || !logForm.text_entry.trim()} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 min-h-[44px]">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-card border border-border rounded-xl px-4 py-3">
              {log.prompt && log.prompt !== "What shifted?" && <p className="text-xs text-accent mb-1 italic">{log.prompt}</p>}
              <p className="text-sm text-foreground leading-relaxed">{log.text_entry}</p>
              <p className="text-xs text-muted-foreground mt-2">{format(new Date(log.created_date), "d MMM, HH:mm")} · {log.author_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}