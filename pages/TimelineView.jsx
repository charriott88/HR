import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Plus, X } from "lucide-react";
import { format, isAfter, isBefore, isToday } from "date-fns";

const PHASES = ["R&D", "Development", "Rehearsal", "Pre-shoot", "Shoot", "Post-production / Performance"];
const TYPES = ["rehearsal", "shoot day", "sharing", "fitting", "milestone", "other"];

export default function TimelineView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ label: "", type: "rehearsal", phase: "", date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    const [projs, timeline] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.TimelineItem.filter({ project_id: projectId }, "date", 50),
    ]);
    setProject(projs[0]);
    if (projs[0]?.current_phase) setForm(f => ({ ...f, phase: projs[0].current_phase }));
    setItems(timeline);
    setLoading(false);
  }

  const handleCreate = async () => {
    if (!form.label || !form.date) return;
    setSaving(true);
    await base44.entities.TimelineItem.create({ ...form, project_id: projectId });
    setForm(f => ({ ...f, label: "", notes: "", date: "" }));
    setShowNew(false);
    setSaving(false);
    load();
  };

  const deleteItem = async (id) => {
    await base44.entities.TimelineItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const today = new Date().toISOString().split("T")[0];
  const past = items.filter(i => i.date < today);
  const upcoming = items.filter(i => i.date >= today);

  const typeColors = {
    "rehearsal": "bg-blue-50 text-blue-700 border-blue-200",
    "shoot day": "bg-red-50 text-red-700 border-red-200",
    "sharing": "bg-purple-50 text-purple-700 border-purple-200",
    "fitting": "bg-amber-50 text-amber-700 border-amber-200",
    "milestone": "bg-green-50 text-green-700 border-green-200",
    "other": "bg-secondary text-secondary-foreground border-border",
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  const ItemRow = ({ item }) => (
    <div className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-center min-w-[40px] pt-0.5">
        <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM")}</p>
        <p className="text-lg font-medium text-foreground leading-none">{format(new Date(item.date), "d")}</p>
        <p className="text-xs text-muted-foreground">{format(new Date(item.date), "EEE")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[item.type] || typeColors.other}`}>{item.type}</span>
          {item.phase && <span className="text-xs text-muted-foreground">{item.phase}</span>}
        </div>
        {item.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.notes}</p>}
      </div>
      <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mt-0.5"><X size={13} /></button>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Timeline</h1>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="ml-auto flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]">
          <Plus size={14} /> Add
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (e.g. Rehearsal Day 3)" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.type === t ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>{t}</button>
            ))}
          </div>
          <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-foreground/50 text-sm">
            <option value="">Select phase</option>
            {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
          </select>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !form.label || !form.date} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 min-h-[44px]">Add</button>
            <button onClick={() => setShowNew(false)} className="p-2.5 border border-border rounded-xl hover:bg-secondary min-h-[44px]"><X size={16} /></button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No dates added yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Upcoming</p>
              <div className="space-y-2">{upcoming.map(i => <ItemRow key={i.id} item={i} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Past</p>
              <div className="space-y-2 opacity-60">{past.map(i => <ItemRow key={i.id} item={i} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}