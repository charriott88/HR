import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Plus, Sparkles, X } from "lucide-react";
import { format } from "date-fns";

const THREAD_KEYWORDS = ["interruption", "tension", "proximity", "delay", "fragmentation", "weight", "stillness", "transition", "repetition", "breath"];

export default function ThreadsView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [threads, setThreads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [projectId]);

  async function load() {
    const [projs, thrds, allLogs] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.Thread.filter({ project_id: projectId }, "-created_date"),
      base44.entities.SessionLog.filter({ project_id: projectId }, "-created_date", 100),
    ]);
    setProject(projs[0]);
    setThreads(thrds);
    setLogs(allLogs);
    setLoading(false);
  }

  const suggestThreads = async () => {
    const allText = logs.map(l => l.text_entry).join(" ").toLowerCase();
    const found = THREAD_KEYWORDS.filter(kw => allText.includes(kw));
    for (const kw of found.slice(0, 3)) {
      const exists = threads.find(t => t.keyword === kw);
      if (!exists) {
        const matchingLogs = logs.filter(l => l.text_entry.toLowerCase().includes(kw));
        await base44.entities.Thread.create({
          project_id: projectId,
          title: kw.charAt(0).toUpperCase() + kw.slice(1),
          keyword: kw,
          is_suggested: true,
          log_ids: matchingLogs.map(l => l.id),
          contributing_collaborators: [...new Set(matchingLogs.map(l => l.author_name).filter(Boolean))],
          created_by: "system",
        });
      }
    }
    load();
  };

  const createThread = async () => {
    if (!newForm.title) return;
    setSaving(true);
    const me = await base44.auth.me();
    await base44.entities.Thread.create({ ...newForm, project_id: projectId, created_by: me.id, log_ids: [], contributing_collaborators: [] });
    setNewForm({ title: "", description: "" });
    setShowNew(false);
    setSaving(false);
    load();
  };

  const threadLogs = selectedThread ? logs.filter(l => (selectedThread.log_ids || []).includes(l.id)) : [];

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  if (selectedThread) {
    return (
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedThread(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></button>
          <div>
            <p className="text-xs text-muted-foreground">{project?.title} · Threads</p>
            <h1 className="font-serif text-2xl text-foreground">{selectedThread.title}</h1>
          </div>
        </div>
        {selectedThread.description && <p className="text-sm text-muted-foreground">{selectedThread.description}</p>}
        {selectedThread.contributing_collaborators?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedThread.contributing_collaborators.map(c => (
              <span key={c} className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full">{c}</span>
            ))}
          </div>
        )}
        {threadLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">No logs linked to this thread yet.</p>
        ) : (
          <div className="space-y-3">
            {threadLogs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-xl px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{log.text_entry}</p>
                <p className="text-xs text-muted-foreground mt-2">{log.author_name} · {log.phase} · {format(new Date(log.created_date), "d MMM")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Threads</h1>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]">
          <Plus size={14} /> New thread
        </button>
        <button onClick={suggestThreads} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors min-h-[44px]">
          <Sparkles size={14} /> Suggest
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="Thread title (e.g. tension, delay)" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <div className="flex gap-2">
            <button onClick={createThread} disabled={saving || !newForm.title} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 min-h-[44px]">Create</button>
            <button onClick={() => setShowNew(false)} className="p-2.5 border border-border rounded-xl hover:bg-secondary min-h-[44px]"><X size={16} /></button>
          </div>
        </div>
      )}

      {threads.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground mb-2">No threads yet.</p>
          <p className="text-xs text-muted-foreground">Create a thread manually or use Suggest to find patterns in your logs.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(t => (
            <button key={t.id} onClick={() => setSelectedThread(t)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-4 hover:border-foreground/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm">{t.title}</p>
                    {t.is_suggested && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">Suggested</span>}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{(t.log_ids || []).length} logs · {(t.contributing_collaborators || []).length} collaborators</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}