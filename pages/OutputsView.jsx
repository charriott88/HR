import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Sparkles, Copy, Check, Trash2, Pencil, Save, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";

const OUTPUT_TYPES = [
  "Project Summary",
  "Process Description",
  "Movement Direction Statement",
  "Collaboration Overview",
  "Development Timeline Summary",
];

export default function OutputsView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [threads, setThreads] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    const [projs, alignments, allLogs, thrds, collabs, tl, outs] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.AlignmentRecord.filter({ project_id: projectId }, "-version", 1),
      base44.entities.SessionLog.filter({ project_id: projectId }, "-created_date", 50),
      base44.entities.Thread.filter({ project_id: projectId }),
      base44.entities.ProjectCollaborator.filter({ project_id: projectId }),
      base44.entities.TimelineItem.filter({ project_id: projectId }, "date"),
      base44.entities.GeneratedOutput.filter({ project_id: projectId }, "-created_date", 20),
    ]);
    setProject(projs[0]);
    setAlignment(alignments[0]);
    setLogs(allLogs);
    setThreads(thrds);
    setCollaborators(collabs);
    setTimeline(tl);
    setOutputs(outs);
    setLoading(false);
  }

  const generate = async (outputType) => {
    setGenerating(outputType);
    const me = await base44.auth.me();

    const contextData = {
      project: { title: project?.title, type: project?.project_type, context: project?.context, outcome: project?.intended_outcome, phase: project?.current_phase },
      alignment: alignment ? { core_intent: alignment.core_intent, principles: [alignment.movement_principle_1, alignment.movement_principle_2, alignment.movement_principle_3].filter(Boolean), camera_rule: alignment.camera_rule, direction_rule: alignment.direction_rule, styling_rule: alignment.styling_rule } : null,
      logs_sample: logs.slice(0, 10).map(l => ({ phase: l.phase, text: l.text_entry, author: l.author_name, date: l.created_date })),
      threads: threads.map(t => ({ title: t.title, log_count: (t.log_ids || []).length })),
      collaborators: collaborators.map(c => ({ name: c.user_name, role: c.assigned_role })),
      timeline: timeline.map(t => ({ label: t.label, type: t.type, date: t.date, phase: t.phase })),
    };

    const prompts = {
      "Project Summary": `Write a concise, professional project summary for "${project?.title}", a ${project?.project_type} project. Context: ${project?.context}. Intended outcome: ${project?.intended_outcome}. Core intent: "${alignment?.core_intent}". Write in third person, 150-200 words, suitable for a portfolio or commissioning brief.`,
      "Process Description": `Write a process description for a movement-led project called "${project?.title}". Current phase: ${project?.current_phase}. Core intent: "${alignment?.core_intent}". The following observations emerged during development: ${logs.slice(0, 8).map(l => `"${l.text_entry}"`).join(", ")}. Write 200-250 words describing the creative process, suitable for a funding application.`,
      "Movement Direction Statement": `Write a movement direction statement for "${project?.title}". Movement principles: ${[alignment?.movement_principle_1, alignment?.movement_principle_2, alignment?.movement_principle_3].filter(Boolean).join("; ")}. Camera approach: ${alignment?.camera_rule}. Direction tone: ${alignment?.direction_rule}. Write in first person, 150-200 words, capturing the movement director's creative intent and methodology.`,
      "Collaboration Overview": `Write a collaboration overview for "${project?.title}". Collaborators: ${collaborators.map(c => `${c.user_name} (${c.assigned_role})`).join(", ")}. Describe how these roles intersect and serve the movement-led vision. Write 150-200 words suitable for a commissioning document.`,
      "Development Timeline Summary": `Write a development timeline summary for "${project?.title}". Key dates and phases: ${timeline.map(t => `${t.label} (${t.type}, ${t.date})`).join(", ")}. Project phases navigated: ${[...new Set(logs.map(l => l.phase).filter(Boolean))].join(", ")}. Write 150-200 words as a narrative timeline summary.`,
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt: prompts[outputType] });
    await base44.entities.GeneratedOutput.create({ project_id: projectId, output_type: outputType, generated_text: result, created_by: me.id });
    setGenerating(null);
    load();
  };

  const copyOutput = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteOutput = async (id) => {
    await base44.entities.GeneratedOutput.delete(id);
    setOutputs(prev => prev.filter(o => o.id !== id));
  };

  const startEdit = (out) => {
    setEditingId(out.id);
    setEditText(out.generated_text);
  };

  const saveEdit = async (id) => {
    await base44.entities.GeneratedOutput.update(id, { generated_text: editText });
    setOutputs(prev => prev.map(o => o.id === id ? { ...o, generated_text: editText } : o));
    setEditingId(null);
  };

  const exportOutputsPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    const margin = 56, contentW = pageW - margin * 2;
    let y = margin;
    const checkPage = (n = 30) => { if (y + n > pageH - margin) { doc.addPage(); y = margin; } };
    const addText = (text, size, bold, color = [30,30,30]) => {
      doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setTextColor(...color);
      doc.splitTextToSize(String(text || ""), contentW).forEach(line => { checkPage(size * 1.6); doc.text(line, margin, y); y += size * 1.45; });
    };
    const addDivider = () => { checkPage(20); doc.setDrawColor(200,200,200); doc.line(margin, y, pageW-margin, y); y += 16; };
    addText(project?.title || "Outputs", 26, true);
    y += 4;
    addText(`Generated Outputs  ·  ${project?.project_type || ""}`, 10, false, [120,120,120]);
    y += 16;
    addDivider();
    outputs.forEach(o => {
      checkPage(40);
      addText(o.output_type.toUpperCase(), 8, true, [100,120,100]);
      y += 2;
      addText(o.generated_text, 10.5, false);
      y += 18;
    });
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(160,160,160); doc.text(`${project?.title || "Outputs"} — AM Mvmt Space`, margin, pageH - 28); doc.text(`${p} / ${total}`, pageW - margin, pageH - 28, { align: "right" }); }
    doc.save(`${(project?.title || "outputs").replace(/\s+/g, "-").toLowerCase()}-outputs.pdf`);
  };

  const exportOutputsWord = async () => {
    const slug = (project?.title || "outputs").replace(/\s+/g, "-").toLowerCase();
    const children = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: project?.title || "Outputs", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: `Generated Outputs · ${project?.project_type || ""}`, size: 20, color: "888888" })] }),
      new Paragraph({ text: "" }),
    ];
    outputs.forEach(o => {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: o.output_type, bold: true })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: o.generated_text, size: 22 })] }));
      children.push(new Paragraph({ text: "" }));
    });
    const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug}-outputs.docx`; a.click();
  };

  const exportOutputsPPT = async () => {
    const slug = (project?.title || "outputs").replace(/\s+/g, "-").toLowerCase();
    const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE";
    const BG = "F7F5EE", FG = "1a2e1a", ACCENT = "4a7a4a";
    const title = pptx.addSlide(); title.background = { color: BG };
    title.addText(project?.title || "Outputs", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 40, bold: true, color: FG, fontFace: "Georgia" });
    title.addText("Generated Outputs — AM Mvmt Space", { x: 0.5, y: 2.9, w: 12, h: 0.6, fontSize: 16, color: "888888" });
    outputs.forEach(o => {
      const s = pptx.addSlide(); s.background = { color: BG };
      s.addText(o.output_type.toUpperCase(), { x: 0.5, y: 0.4, w: 12, h: 0.4, fontSize: 10, bold: true, color: ACCENT });
      s.addText(o.generated_text, { x: 0.5, y: 1.0, w: 12, h: 4, fontSize: 14, color: FG, valign: "top", wrap: true });
    });
    await pptx.writeFile({ fileName: `${slug}-outputs.pptx` });
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  const groupedOutputs = OUTPUT_TYPES.reduce((acc, type) => {
    acc[type] = outputs.filter(o => o.output_type === type);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Outputs</h1>
        </div>
      </div>

      <div className="bg-secondary/50 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">Generate structured text from your project data — for funding applications, pitches, and portfolio use.</p>
      </div>

      {outputs.length > 0 && (
        <div className="flex gap-2">
          <button onClick={exportOutputsPDF} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-xs font-medium hover:bg-muted min-h-[44px]"><Download size={12} /> PDF</button>
          <button onClick={exportOutputsWord} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-xs font-medium hover:bg-muted min-h-[44px]"><Download size={12} /> Word</button>
          <button onClick={exportOutputsPPT} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-xs font-medium hover:bg-muted min-h-[44px]"><Download size={12} /> PPT</button>
        </div>
      )}

      <div className="space-y-4">
        {OUTPUT_TYPES.map(type => (
          <div key={type} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">{type}</p>
              <button
                onClick={() => generate(type)}
                disabled={!!generating}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
              >
                {generating === type ? (
                  <><div className="w-3 h-3 border border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={12} /> Generate</>
                )}
              </button>
            </div>

            {groupedOutputs[type].length > 0 ? (
              <div className="divide-y divide-border">
                {groupedOutputs[type].map(out => (
                  <div key={out.id} className="px-4 py-4">
                    <p className="text-xs text-muted-foreground mb-2">{format(new Date(out.created_date), "d MMM yyyy, HH:mm")}</p>
                    {editingId === out.id ? (
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={8}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm resize-y focus:outline-none focus:border-foreground/50"
                      />
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{out.generated_text}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {editingId === out.id ? (
                        <button onClick={() => saveEdit(out.id)} className="flex items-center gap-1 text-xs text-foreground font-medium hover:opacity-70 min-h-[44px]">
                          <Save size={12} /> Save
                        </button>
                      ) : (
                        <button onClick={() => startEdit(out)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px]">
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                      <button onClick={() => copyOutput(out.generated_text, out.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px] ml-1">
                        {copied === out.id ? <Check size={12} /> : <Copy size={12} />}
                        {copied === out.id ? "Copied" : "Copy"}
                      </button>
                      <button onClick={() => deleteOutput(out.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive min-h-[44px] ml-1">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-4 py-3">No outputs yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}