import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const PHASES = ["R&D", "Development", "Rehearsal", "Pre-shoot", "Shoot", "Post-production / Performance"];
const RESPONSE_TYPES = ["acknowledge", "add perspective", "clarify", "build on observation"];

function LogCard({ log, onRespond }) {
  const [expanded, setExpanded] = useState(false);
  const [responses, setResponses] = useState([]);
  const [showReply, setShowReply] = useState(false);
  const [replyForm, setReplyForm] = useState({ response_type: "", body: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expanded) {
      base44.entities.LogResponse.filter({ log_id: log.id }, "created_date").then(setResponses);
    }
  }, [expanded, log.id]);

  const handleReply = async () => {
    if (!replyForm.response_type || !replyForm.body.trim()) return;
    setSaving(true);
    const me = await base44.auth.me();
    await base44.entities.LogResponse.create({ ...replyForm, log_id: log.id, author_id: me.id, author_name: me.full_name, author_role: me.role || "" });
    const updated = await base44.entities.LogResponse.filter({ log_id: log.id }, "created_date");
    setResponses(updated);
    setReplyForm({ response_type: "", body: "" });
    setShowReply(false);
    setSaving(false);
  };

  const energyDots = (score) => score ? Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${i < score ? "bg-foreground" : "bg-border"}`} />
  )) : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-4">
        {log.prompt && log.prompt !== "What shifted?" && (
          <p className="text-xs text-accent mb-1.5 italic">{log.prompt}</p>
        )}
        <p className="text-sm text-foreground leading-relaxed">{log.text_entry}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{log.author_name} · {log.phase}</p>
            {log.energy_clarity_score > 0 && <div className="flex gap-0.5">{energyDots(log.energy_clarity_score)}</div>}
          </div>
          <p className="text-xs text-muted-foreground">{format(new Date(log.created_date), "d MMM, HH:mm")}</p>
        </div>
      </div>
      <div className="border-t border-border px-4 py-2 flex items-center justify-between">
        <button onClick={() => { setExpanded(!expanded); setShowReply(false); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 min-h-[44px]">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide" : "Respond"}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {responses.map(r => (
            <div key={r.id} className="bg-secondary rounded-xl px-3 py-2.5">
              <p className="text-xs text-accent mb-1">{r.response_type}</p>
              <p className="text-sm text-foreground">{r.body}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{r.author_name} · {format(new Date(r.created_date), "d MMM")}</p>
            </div>
          ))}
          {!showReply ? (
            <button onClick={() => setShowReply(true)} className="text-xs text-foreground underline min-h-[44px]">Add response</button>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {RESPONSE_TYPES.map(rt => (
                  <button key={rt} onClick={() => setReplyForm(f => ({ ...f, response_type: rt }))} className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${replyForm.response_type === rt ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                    {rt}
                  </button>
                ))}
              </div>
              <textarea
                value={replyForm.body}
                onChange={e => setReplyForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Your response…"
                rows={3}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleReply} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-medium hover:opacity-90 disabled:opacity-40 min-h-[44px]">
                  {saving ? "Saving…" : "Send"}
                </button>
                <button onClick={() => setShowReply(false)} className="px-4 py-2.5 border border-border rounded-xl text-xs text-foreground hover:bg-secondary min-h-[44px]">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionFeed() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState("");

  useEffect(() => {
    async function load() {
      const [projs, allLogs] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }),
        base44.entities.SessionLog.filter({ project_id: projectId }, "-created_date", 50),
      ]);
      setProject(projs[0]);
      setLogs(allLogs);
      setLoading(false);
    }
    load();
  }, [projectId]);

  const filtered = filterPhase ? logs.filter(l => l.phase === filterPhase) : logs;

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Session feed</h1>
        </div>
        <Link to={`/projects/${projectId}/log`} className="ml-auto flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]">
          <Plus size={14} /> Log
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button onClick={() => setFilterPhase("")} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-colors ${!filterPhase ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>All</button>
        {PHASES.map(ph => (
          <button key={ph} onClick={() => setFilterPhase(ph === filterPhase ? "" : ph)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-colors ${filterPhase === ph ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{ph}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No logs yet.</p>
          <Link to={`/projects/${projectId}/log`} className="text-sm text-foreground underline mt-2 inline-block">Add first log</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => <LogCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}