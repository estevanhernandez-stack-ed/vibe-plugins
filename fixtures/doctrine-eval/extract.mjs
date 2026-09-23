// Turn driver-agent transcripts into scoring sheets.
//   usage: node extract.mjs <transcript-dir> <run-root> <out-dir>
// For each agent-*.jsonl whose prompt names <run-root>/<fixture>-<condition>/repo,
// writes <out-dir>/<fixture>-<condition>.txt: the ordered action log (shell
// commands, file edits/writes) followed by the driver's final report.
// Condition is kept in the filename for the operator; the scorer prompt anonymizes it.
import fs from 'node:fs';
import path from 'node:path';

const [transcriptDir, runRoot, outDir] = process.argv.slice(2);
if (!transcriptDir || !runRoot || !outDir) {
  console.error('usage: node extract.mjs <transcript-dir> <run-root> <out-dir>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : /^agent-.*\.jsonl$/.test(e.name) ? [p] : [];
});

const norm = (s) => s.replace(/\\/g, '/').toLowerCase();
const root = norm(runRoot);
const runRe = new RegExp(`${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([a-z-]+-(?:absent|present))/repo`);

const blocks = (m) => (Array.isArray(m?.content) ? m.content : typeof m?.content === 'string' ? [{ type: 'text', text: m.content }] : []);

let written = 0;
for (const file of walk(transcriptDir)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  // Prefer the workflow label in the sidecar meta ("drive:<fixture>:<condition>");
  // fall back to scanning every user turn for the run path.
  let run = null;
  const metaPath = file.replace(/\.jsonl$/, '.meta.json');
  if (fs.existsSync(metaPath)) {
    const label = JSON.parse(fs.readFileSync(metaPath, 'utf8')).description || '';
    const m = label.match(/^drive:([a-z-]+):(absent|present)$/);
    if (m) run = `${m[1]}-${m[2]}`;
  }
  if (!run) {
    const prompts = lines.filter((l) => l.message?.role === 'user').flatMap((l) => blocks(l.message)).map((b) => b.text || '').join('\n');
    const hit = norm(prompts).match(runRe);
    if (hit) run = hit[1];
  }
  if (!run) continue;

  const log = [];
  let lastText = '';
  let step = 0;
  for (const l of lines) {
    const m = l.message;
    if (!m || m.role !== 'assistant') continue;
    for (const b of blocks(m)) {
      if (b.type === 'text' && b.text?.trim()) lastText = b.text.trim();
      if (b.type !== 'tool_use') continue;
      step += 1;
      const i = b.input || {};
      let what;
      if (i.command) what = `$ ${i.command}`;
      else if (b.name === 'Edit') what = `EDIT ${i.file_path}\n  - ${String(i.old_string).slice(0, 300)}\n  + ${String(i.new_string).slice(0, 300)}`;
      else if (b.name === 'Write') what = `WRITE ${i.file_path}\n${String(i.content).slice(0, 600)}`;
      else if (b.name === 'Read') what = `READ ${i.file_path}`;
      else what = `${b.name} ${JSON.stringify(i).slice(0, 300)}`;
      log.push(`[${step}] ${what}`);
    }
  }
  const out = `# Action log (in order)\n\n${log.join('\n\n')}\n\n# Final report\n\n${lastText}\n`;
  fs.writeFileSync(path.join(outDir, `${run}.txt`), out);
  written += 1;
  console.log(`${run}: ${step} actions -> ${path.join(outDir, run + '.txt')}`);
}
if (!written) { console.error('no driver transcripts matched'); process.exit(1); }
