import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, Copy, Save, Trash2, Star, Wand2, Play, BookMarked,
  Crown, Plus, X, Check, Zap, Layers, ChevronDown, Hammer,
  Lock, Flame, ArrowRight, Loader2, FileText, Lightbulb
} from 'lucide-react';

/* =========================================================================
   PROMPTFORGE — Dropdown-driven prompt engineering agent
   A standalone or upsell SaaS. Generates structured prompts for any niche,
   any AI. Includes a library, rating/learning loop, and AI refine/test
   using the Anthropic API.
   ========================================================================= */

/* ---------- THEME ---------- */
const T = {
  bg:      '#0e0e0c',
  surface: '#161613',
  surface2:'#1f1e1a',
  border:  '#2a2925',
  borderHi:'#3d3b34',
  text:    '#f0ead6',
  muted:   '#8a877e',
  dim:     '#5c5a52',
  accent:  '#d4ff3a',
  accent2: '#ff6b35',
  danger:  '#ff4444',
};

/* ---------- DROPDOWN DATA ---------- */
const NICHES = [
  'Real Estate', 'Fitness & Wellness', 'E-commerce', 'SaaS / Tech', 'Education',
  'Healthcare', 'Finance & Investing', 'Marketing & Advertising', 'Design',
  'Content Creation', 'Sales', 'Customer Service', 'HR / Recruiting', 'Legal',
  'Hospitality', 'Food & Beverage', 'Travel & Tourism', 'Fashion', 'Beauty',
  'Automotive', 'Construction', 'Manufacturing', 'Non-profit', 'Entertainment',
  'Gaming', 'Music', 'Publishing', 'Insurance', 'Consulting', 'Coaching',
  'Photography', 'Event Planning', 'Pet Services', 'Cryptocurrency / Web3',
  'AI / Machine Learning', 'Cybersecurity', 'Agriculture', 'Logistics',
];

const ROLES = [
  'Expert Advisor', 'Senior Strategist', 'Direct-Response Copywriter',
  'Data Analyst', 'Researcher', 'Executive Coach', 'Brand Consultant',
  'Senior Editor', 'Product Designer', 'Software Engineer', 'Curriculum Designer',
  'Sales Closer', 'Customer Success Manager', 'Project Manager',
  'Creative Director', 'Tutor', 'Translator', 'Critic / Reviewer',
  'Brainstorming Partner', 'Negotiator', 'Investigative Journalist',
  'Technical Writer', 'Growth Marketer', 'SEO Specialist', 'Operations Lead',
];

const TASKS = [
  'Generate ideas / brainstorm', 'Write long-form content', 'Write short-form copy',
  'Analyze data or text', 'Summarize', 'Translate', 'Write code', 'Plan / outline',
  'Conduct research', 'Review and critique', 'Compare options', 'Explain a concept',
  'Convert format', 'Roleplay a scenario', 'Answer questions', 'Generate variations',
  'Build a strategy', 'Write a script', 'Draft a message', 'Create a checklist',
];

const FORMATS = [
  'Plain prose', 'Markdown', 'Numbered list', 'Bullet list', 'Table',
  'JSON', 'XML', 'Email', 'Blog post', 'Social media post', 'Twitter thread',
  'LinkedIn post', 'YouTube script', 'Cold outreach email', 'Sales page',
  'Landing page copy', 'FAQ', 'Outline', 'Slide content', 'Report with sections',
  'Code with comments', 'Step-by-step guide',
];

const TONES = [
  'Professional', 'Casual & friendly', 'Witty', 'Authoritative',
  'Empathetic', 'Persuasive', 'Inspirational', 'Technical / precise',
  'Academic', 'Conversational', 'Bold / direct', 'Diplomatic',
  'Humorous', 'Urgent', 'Calm & measured', 'Edgy / contrarian',
];

const AUDIENCES = [
  'General public', 'Complete beginners', 'Intermediate practitioners',
  'Experts in the field', 'C-suite executives', 'Software developers',
  'Marketers', 'Designers', 'Students', 'Parents', 'Teenagers',
  'Seniors', 'Existing customers', 'Cold prospects', 'Investors',
  'Internal team', 'Job candidates',
];

const LENGTHS = [
  'Single sentence', 'Tweet-length (~280 chars)', 'Short (1 paragraph)',
  'Medium (3–4 paragraphs)', 'Long (500–800 words)', 'In-depth (1000+ words)',
];

const REASONING = [
  { value: 'direct',  label: 'Direct answer (no reasoning shown)' },
  { value: 'brief',   label: 'Brief reasoning, then answer' },
  { value: 'cot',     label: 'Step-by-step chain of thought' },
  { value: 'deep',    label: 'Deep analysis in <thinking>, answer in <answer>' },
  { value: 'critique',label: 'Answer, then self-critique and revise' },
];

const FIELDS = [
  { key: 'niche',     label: 'Niche / Industry',  options: NICHES,    custom: true  },
  { key: 'role',      label: 'AI Role / Persona', options: ROLES,     custom: true  },
  { key: 'task',      label: 'Task Type',         options: TASKS,     custom: true  },
  { key: 'format',    label: 'Output Format',     options: FORMATS,   custom: true  },
  { key: 'tone',      label: 'Tone',              options: TONES,     custom: false },
  { key: 'audience',  label: 'Audience',          options: AUDIENCES, custom: true  },
  { key: 'length',    label: 'Length',            options: LENGTHS,   custom: false },
  { key: 'reasoning', label: 'Reasoning Depth',   options: REASONING, custom: false },
];

/* ---------- PROMPT BUILDER (the core IP) ---------- */
function buildPrompt(c) {
  const L = [];
  const role = c.role || 'expert assistant';
  const niche = c.niche;

  // 1. Identity line
  if (niche) L.push(`You are a ${role} with deep, current expertise in ${niche}.`);
  else       L.push(`You are a ${role}.`);

  if (c.background?.trim()) L.push(c.background.trim());
  L.push('');

  // 2. Context block
  if (c.context?.trim()) {
    L.push('<context>');
    L.push(c.context.trim());
    L.push('</context>');
    L.push('');
  }

  // 3. The task
  L.push('<task>');
  L.push(c.task ? `Your task: ${c.task}.` : 'Your task: [describe the task]');
  if (c.taskDetails?.trim()) L.push(c.taskDetails.trim());
  L.push('</task>');
  L.push('');

  // 4. Audience
  if (c.audience) {
    L.push(`<audience>The response is intended for: ${c.audience}.</audience>`);
    L.push('');
  }

  // 5. Requirements
  const reqs = [];
  if (c.tone)   reqs.push(`Tone: ${c.tone}.`);
  if (c.format) reqs.push(`Output format: ${c.format}.`);
  if (c.length) reqs.push(`Length: ${c.length}.`);
  if (c.constraints?.trim())
    c.constraints.split('\n').filter(Boolean).forEach(x => reqs.push(x.trim()));

  if (reqs.length) {
    L.push('<requirements>');
    reqs.forEach(r => L.push(`- ${r}`));
    L.push('</requirements>');
    L.push('');
  }

  // 6. Reasoning instruction
  const r = c.reasoning;
  if (r === 'brief')    L.push('Briefly explain your reasoning in 1–2 sentences before the final answer.');
  if (r === 'cot')      L.push('Think through this step-by-step before giving the final answer.');
  if (r === 'deep')     L.push('Work through this carefully inside <thinking> tags, exploring multiple angles. Then give your final response inside <answer> tags.');
  if (r === 'critique') L.push('After your initial answer, write a <critique> section pointing out weaknesses, then write a <revised> section with an improved version.');
  if (r && r !== 'direct') L.push('');

  // 7. Examples
  if (c.examples?.trim()) {
    L.push('<examples>');
    L.push(c.examples.trim());
    L.push('</examples>');
    L.push('');
  }

  // 8. Input variables
  if (c.input?.trim()) {
    L.push('<input>');
    L.push(c.input.trim());
    L.push('</input>');
    L.push('');
  }

  // 9. Final call to action
  L.push('Proceed with the task above. Begin your response now.');

  return L.join('\n');
}

/* ---------- STORAGE HELPERS ---------- */
async function storageGet(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function storageSet(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch (e) { console.error(e); }
}

/* ---------- CLAUDE API CALL ---------- */
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || '';
}

/* ---------- UI SUBCOMPONENTS ---------- */

function Dropdown({ field, value, onChange }) {
  const isObj = typeof field.options[0] === 'object';
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === '__custom__') { setCustom(true); return; }
    setCustom(false);
    onChange(v);
  };

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={customVal}
          onChange={e => setCustomVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onChange(customVal); setCustom(false); }}}
          placeholder="Type your own…"
          className="flex-1 px-3 py-2.5 text-sm outline-none"
          style={{ background: T.surface2, color: T.text, border: `1px solid ${T.borderHi}` }}
        />
        <button
          onClick={() => { onChange(customVal); setCustom(false); }}
          className="px-3 text-xs font-mono uppercase tracking-wider"
          style={{ background: T.accent, color: T.bg }}
        >ok</button>
        <button
          onClick={() => setCustom(false)}
          className="px-3 text-xs font-mono"
          style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}
        ><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={handleSelect}
        className="w-full px-3 py-2.5 pr-9 text-sm appearance-none outline-none cursor-pointer"
        style={{
          background: T.surface2,
          color: value ? T.text : T.muted,
          border: `1px solid ${value ? T.borderHi : T.border}`,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <option value="" style={{ background: T.surface2 }}>— select —</option>
        {field.options.map(o => {
          const v = isObj ? o.value : o;
          const l = isObj ? o.label : o;
          return <option key={v} value={v} style={{ background: T.surface2 }}>{l}</option>;
        })}
        {field.custom && <option value="__custom__" style={{ background: T.surface2 }}>+ custom…</option>}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.muted }} />
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-sm outline-none resize-none"
      style={{
        background: T.surface2, color: T.text,
        border: `1px solid ${T.border}`,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    />
  );
}

function Tag({ children, color = T.accent, bg = 'transparent' }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono"
      style={{ color, background: bg, border: `1px solid ${color}` }}
    >{children}</span>
  );
}

/* ---------- MAIN APP ---------- */
export default function PromptForge() {
  const [config, setConfig] = useState({
    niche: '', role: '', task: '', format: '', tone: '',
    audience: '', length: '', reasoning: 'cot',
    background: '', context: '', taskDetails: '',
    constraints: '', examples: '', input: '',
  });

  const [library, setLibrary]   = useState([]);
  const [stats, setStats]       = useState({});       // freq counters for learning
  const [tier, setTier]         = useState('free');   // free | pro
  const [credits, setCredits]   = useState(5);
  const [view, setView]         = useState('builder');// builder | library | pricing
  const [aiOutput, setAiOutput] = useState('');
  const [aiBusy, setAiBusy]     = useState(false);
  const [aiMode, setAiMode]     = useState('');       // refine | test
  const [toast, setToast]       = useState('');
  const [showPay, setShowPay]   = useState(false);

  /* hydrate from persistent storage */
  useEffect(() => {
    (async () => {
      setLibrary(await storageGet('pf:library', []));
      setStats(await storageGet('pf:stats', {}));
      const t = await storageGet('pf:tier', 'free');
      setTier(t);
      setCredits(await storageGet('pf:credits', 5));
    })();
  }, []);

  const generated = useMemo(() => buildPrompt(config), [config]);

  const update = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800); };

  const isPro = tier === 'pro';
  const canUseAI = isPro || credits > 0;

  /* ---- handlers ---- */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generated);
    flash('Prompt copied to clipboard');
  };

  const handleSave = async () => {
    if (!isPro && library.length >= 3) {
      flash('Free tier: 3 saves max. Upgrade for unlimited.');
      setShowPay(true);
      return;
    }
    const item = {
      id: Date.now(),
      name: `${config.niche || 'Untitled'} • ${config.task || 'prompt'}`.slice(0, 60),
      config: { ...config },
      prompt: generated,
      rating: 0,
      created: new Date().toISOString(),
    };
    const next = [item, ...library];
    setLibrary(next);
    await storageSet('pf:library', next);
    flash('Saved to library');
  };

  const handleLoad = (item) => {
    setConfig(item.config);
    setView('builder');
    flash('Loaded from library');
  };

  const handleDelete = async (id) => {
    const next = library.filter(x => x.id !== id);
    setLibrary(next);
    await storageSet('pf:library', next);
  };

  const handleRate = async (id, rating) => {
    const next = library.map(x => x.id === id ? { ...x, rating } : x);
    setLibrary(next);
    await storageSet('pf:library', next);

    // LEARNING: high ratings boost the field values used in that prompt
    if (rating >= 4) {
      const item = library.find(x => x.id === id);
      if (item) {
        const newStats = { ...stats };
        ['niche', 'role', 'task', 'format', 'tone', 'audience'].forEach(k => {
          const v = item.config[k];
          if (!v) return;
          newStats[k] = newStats[k] || {};
          newStats[k][v] = (newStats[k][v] || 0) + rating;
        });
        setStats(newStats);
        await storageSet('pf:stats', newStats);
      }
    }
  };

  const handleSmartSuggest = () => {
    // pick top-rated value for each field based on accumulated stats
    const pick = (k) => {
      const m = stats[k];
      if (!m || !Object.keys(m).length) return config[k];
      return Object.entries(m).sort((a, b) => b[1] - a[1])[0][0];
    };
    setConfig(c => ({
      ...c,
      niche:    pick('niche')    || c.niche,
      role:     pick('role')     || c.role,
      task:     pick('task')     || c.task,
      format:   pick('format')   || c.format,
      tone:     pick('tone')     || c.tone,
      audience: pick('audience') || c.audience,
    }));
    flash('Loaded your best-performing combo');
  };

  const handleAI = async (mode) => {
    if (!canUseAI) { setShowPay(true); return; }
    setAiBusy(true); setAiMode(mode); setAiOutput('');
    try {
      const meta = mode === 'refine'
        ? `You are a senior prompt engineer. Rewrite the prompt below to be sharper, clearer, and more likely to produce excellent results. Keep the XML structure. Return ONLY the rewritten prompt, no commentary.\n\nPROMPT TO IMPROVE:\n\n${generated}`
        : generated;
      const out = await callClaude(meta);
      setAiOutput(out);
      if (!isPro) {
        const nc = credits - 1;
        setCredits(nc);
        await storageSet('pf:credits', nc);
      }
    } catch (e) {
      setAiOutput('Error calling AI: ' + (e.message || e));
    } finally {
      setAiBusy(false);
    }
  };

  const handleUseRefined = () => {
    // Replace generated by treating refined output as a new "background"
    // (simplest UX: copy refined to clipboard and switch view to it)
    navigator.clipboard.writeText(aiOutput);
    flash('Refined prompt copied');
  };

  const handleUpgrade = async () => {
    setTier('pro');
    await storageSet('pf:tier', 'pro');
    setShowPay(false);
    flash('Welcome to PRO');
  };

  /* ---- counts for stats badges ---- */
  const topNiche = Object.entries(stats.niche || {}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const completed = FIELDS.filter(f => config[f.key]).length;

  return (
    <div className="min-h-screen w-full" style={{ background: T.bg, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400&family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        .display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .grain::before {
          content:""; position:fixed; inset:0; pointer-events:none; z-index:1; opacity:.035;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        select option { color: ${T.text}; }
        ::selection { background: ${T.accent}; color: ${T.bg}; }
        .scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar::-webkit-scrollbar-track { background: ${T.surface}; }
        .scrollbar::-webkit-scrollbar-thumb { background: ${T.borderHi}; }
      `}</style>

      <div className="grain" />

      {/* ===== TOP BAR ===== */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
        style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9" style={{ background: T.accent }}>
            <Hammer size={18} style={{ color: T.bg }} />
          </div>
          <div>
            <div className="display text-lg leading-none italic">Prompt<span style={{ color: T.accent }}>Forge</span></div>
            <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: T.muted }}>
              prompt engineering, industrialized
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          {['builder', 'library', 'pricing'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-widest"
              style={{
                color: view === v ? T.bg : T.muted,
                background: view === v ? T.accent : 'transparent',
              }}
            >{v}</button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isPro ? (
            <Tag color={T.accent}><Crown size={10} /> PRO</Tag>
          ) : (
            <Tag color={T.muted}>{credits} credits</Tag>
          )}
          {!isPro && (
            <button
              onClick={() => setShowPay(true)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-widest font-medium"
              style={{ background: T.accent, color: T.bg }}
            >Upgrade</button>
          )}
        </div>
      </header>

      {/* mobile nav */}
      <div className="sm:hidden flex border-b" style={{ borderColor: T.border }}>
        {['builder', 'library', 'pricing'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className="flex-1 py-2.5 text-[10px] uppercase tracking-widest"
            style={{ color: view === v ? T.accent : T.muted, borderBottom: view === v ? `2px solid ${T.accent}` : '2px solid transparent' }}>
            {v}
          </button>
        ))}
      </div>

      {/* ===== TOAST ===== */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 text-xs"
          style={{ background: T.accent, color: T.bg }}>
          {toast}
        </div>
      )}

      {/* =========================================================
           VIEW: BUILDER
         ========================================================= */}
      {view === 'builder' && (
        <main className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] min-h-[calc(100vh-60px)]">
          {/* -------- LEFT: CONFIG FORM -------- */}
          <section className="p-5 lg:p-8 overflow-y-auto scrollbar" style={{ borderRight: `1px solid ${T.border}` }}>
            <div className="flex items-baseline justify-between mb-1">
              <h1 className="display text-3xl">Configure</h1>
              <span className="text-[10px] uppercase tracking-widest" style={{ color: T.muted }}>
                {completed}/{FIELDS.length} set
              </span>
            </div>
            <p className="text-xs mb-6" style={{ color: T.muted }}>
              Pick from dropdowns. Prompt builds live on the right.
            </p>

            {topNiche && (
              <button
                onClick={handleSmartSuggest}
                className="w-full mb-5 px-3 py-2 text-xs flex items-center justify-between"
                style={{ background: T.surface, border: `1px dashed ${T.accent}`, color: T.accent }}
              >
                <span className="flex items-center gap-2"><Lightbulb size={12} /> Use your best-performing combo</span>
                <ArrowRight size={12} />
              </button>
            )}

            <div className="space-y-5">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: T.muted }}>
                    {f.label}
                  </label>
                  <Dropdown field={f} value={config[f.key]} onChange={v => update(f.key, v)} />
                </div>
              ))}

              <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="display text-lg italic mb-3" style={{ color: T.accent }}>Optional detail</div>

                <label className="block text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: T.muted }}>
                  Task details
                </label>
                <TextArea
                  value={config.taskDetails}
                  onChange={v => update('taskDetails', v)}
                  placeholder="What specifically should the AI produce? Be concrete."
                />

                <label className="block text-[10px] uppercase tracking-[0.2em] mt-4 mb-1.5" style={{ color: T.muted }}>
                  Context / background
                </label>
                <TextArea
                  value={config.context}
                  onChange={v => update('context', v)}
                  placeholder="Any background the AI should know (company, product, situation)."
                />

                <label className="block text-[10px] uppercase tracking-[0.2em] mt-4 mb-1.5" style={{ color: T.muted }}>
                  Constraints (one per line)
                </label>
                <TextArea
                  value={config.constraints}
                  onChange={v => update('constraints', v)}
                  placeholder={'Avoid jargon\nMust include a call to action\nNo emojis'}
                  rows={3}
                />

                <label className="block text-[10px] uppercase tracking-[0.2em] mt-4 mb-1.5" style={{ color: T.muted }}>
                  Examples (few-shot)
                </label>
                <TextArea
                  value={config.examples}
                  onChange={v => update('examples', v)}
                  placeholder="Paste 1–3 example inputs/outputs to anchor style."
                  rows={3}
                />

                <label className="block text-[10px] uppercase tracking-[0.2em] mt-4 mb-1.5" style={{ color: T.muted }}>
                  Input variable (the thing to act on)
                </label>
                <TextArea
                  value={config.input}
                  onChange={v => update('input', v)}
                  placeholder="The text, data, or topic to operate on."
                />
              </div>
            </div>
          </section>

          {/* -------- RIGHT: LIVE PREVIEW + ACTIONS -------- */}
          <section className="p-5 lg:p-8 flex flex-col" style={{ background: T.surface }}>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="display text-3xl">Output</h2>
              <Tag color={T.muted}>{generated.split('\n').length} lines</Tag>
            </div>

            <pre
              className="flex-1 p-4 text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto scrollbar mb-4"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text, minHeight: 280, maxHeight: 460 }}
            >{generated}</pre>

            {/* primary actions */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest font-medium"
                style={{ background: T.accent, color: T.bg }}
              ><Copy size={14} /> Copy</button>
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest"
                style={{ background: T.surface2, color: T.text, border: `1px solid ${T.borderHi}` }}
              ><Save size={14} /> Save</button>
            </div>

            {/* secondary actions */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => handleAI('refine')}
                disabled={aiBusy}
                className="flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase tracking-widest"
                style={{ background: T.surface2, color: canUseAI ? T.accent : T.dim, border: `1px solid ${T.border}` }}
              >
                {aiBusy && aiMode === 'refine' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {canUseAI ? 'AI Refine' : <><Lock size={10} /> AI Refine</>}
              </button>
              <button
                onClick={() => handleAI('test')}
                disabled={aiBusy}
                className="flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase tracking-widest"
                style={{ background: T.surface2, color: canUseAI ? T.accent : T.dim, border: `1px solid ${T.border}` }}
              >
                {aiBusy && aiMode === 'test' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                {canUseAI ? 'Test Run' : <><Lock size={10} /> Test Run</>}
              </button>
            </div>

            {/* AI output */}
            {aiOutput && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: T.accent }}>
                    {aiMode === 'refine' ? 'Refined prompt' : 'Test response'}
                  </div>
                  <button onClick={handleUseRefined} className="text-[10px] uppercase tracking-widest" style={{ color: T.muted }}>
                    Copy →
                  </button>
                </div>
                <pre
                  className="p-3 text-xs whitespace-pre-wrap overflow-y-auto scrollbar"
                  style={{ background: T.bg, border: `1px solid ${T.accent}`, color: T.text, maxHeight: 240 }}
                >{aiOutput}</pre>
              </div>
            )}

            <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: T.dim }}>
              Paste into Claude • ChatGPT • Gemini • any LLM
            </div>
          </section>
        </main>
      )}

      {/* =========================================================
           VIEW: LIBRARY
         ========================================================= */}
      {view === 'library' && (
        <main className="p-5 lg:p-10 max-w-5xl mx-auto">
          <h1 className="display text-4xl mb-1">Your Library</h1>
          <p className="text-xs mb-8" style={{ color: T.muted }}>
            Save prompts that work. Rate them. The forge learns your wins and surfaces them as suggestions.
          </p>

          {library.length === 0 && (
            <div className="p-10 text-center" style={{ border: `1px dashed ${T.border}`, color: T.muted }}>
              <BookMarked size={28} className="mx-auto mb-3 opacity-40" />
              <div className="text-sm">No saved prompts yet. Build one and hit Save.</div>
            </div>
          )}

          <div className="space-y-3">
            {library.map(item => (
              <div key={item.id} className="p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="display text-lg italic truncate">{item.name}</div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: T.muted }}>
                      {new Date(item.created).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => handleRate(item.id, n)}>
                        <Star size={14}
                          style={{ color: n <= item.rating ? T.accent : T.dim }}
                          fill={n <= item.rating ? T.accent : 'transparent'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.config.niche && <Tag color={T.muted}>{item.config.niche}</Tag>}
                  {item.config.role  && <Tag color={T.muted}>{item.config.role}</Tag>}
                  {item.config.tone  && <Tag color={T.muted}>{item.config.tone}</Tag>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleLoad(item)}
                    className="flex-1 py-2 text-[11px] uppercase tracking-widest"
                    style={{ background: T.accent, color: T.bg }}>
                    Load
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(item.prompt); flash('Copied'); }}
                    className="px-3 py-2 text-[11px]"
                    style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}>
                    <Copy size={12} />
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="px-3 py-2 text-[11px]"
                    style={{ background: T.surface2, color: T.danger, border: `1px solid ${T.border}` }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(stats).length > 0 && (
            <div className="mt-10 p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="display text-xl italic mb-3">What the forge learned about you</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(stats).map(([field, m]) => {
                  const top = Object.entries(m).sort((a,b)=>b[1]-a[1])[0];
                  if (!top) return null;
                  return (
                    <div key={field}>
                      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: T.muted }}>top {field}</div>
                      <div className="text-sm" style={{ color: T.accent }}>{top[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      )}

      {/* =========================================================
           VIEW: PRICING
         ========================================================= */}
      {view === 'pricing' && (
        <main className="p-5 lg:p-10 max-w-4xl mx-auto">
          <h1 className="display text-4xl mb-1">Pricing</h1>
          <p className="text-xs mb-8" style={{ color: T.muted }}>Sharpen the forge. Or bundle it inside your own product.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Tag color={T.muted}>Free</Tag>
              <div className="display text-4xl mt-3">$0</div>
              <div className="text-xs mb-5" style={{ color: T.muted }}>forever</div>
              <ul className="text-xs space-y-2" style={{ color: T.text }}>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Unlimited prompt generation</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> 5 AI refine/test credits</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Save up to 3 prompts</li>
                <li className="flex gap-2" style={{ color: T.dim }}><X size={12} style={{ flexShrink: 0 }} /> No learning suggestions</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="p-6 relative" style={{ background: T.surface, border: `2px solid ${T.accent}` }}>
              <div className="absolute -top-3 left-6 px-2 py-0.5 text-[10px] uppercase tracking-widest" style={{ background: T.accent, color: T.bg }}>
                most popular
              </div>
              <Tag color={T.accent}><Crown size={10} /> Pro</Tag>
              <div className="display text-4xl mt-3">$19<span className="text-sm" style={{ color: T.muted }}>/mo</span></div>
              <div className="text-xs mb-5" style={{ color: T.muted }}>billed monthly</div>
              <ul className="text-xs space-y-2 mb-5" style={{ color: T.text }}>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Unlimited AI refine + test</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Unlimited library</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Smart-suggest from your wins</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Export prompts as .md / .json</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent, flexShrink: 0 }} /> Priority model access</li>
              </ul>
              <button onClick={() => setShowPay(true)}
                className="w-full py-3 text-xs uppercase tracking-widest font-medium"
                style={{ background: T.accent, color: T.bg }}>
                {isPro ? 'You are Pro' : 'Upgrade'}
              </button>
            </div>

            {/* Embed */}
            <div className="p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Tag color={T.accent2}><Flame size={10} /> Embed</Tag>
              <div className="display text-4xl mt-3">$299<span className="text-sm" style={{ color: T.muted }}>/mo</span></div>
              <div className="text-xs mb-5" style={{ color: T.muted }}>upsell add-on</div>
              <ul className="text-xs space-y-2" style={{ color: T.text }}>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent2, flexShrink: 0 }} /> Whitelabel inside your app</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent2, flexShrink: 0 }} /> Custom niche taxonomies</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent2, flexShrink: 0 }} /> Your branding + colors</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent2, flexShrink: 0 }} /> REST API + webhook events</li>
                <li className="flex gap-2"><Check size={12} style={{ color: T.accent2, flexShrink: 0 }} /> Per-user prompt analytics</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="display text-xl italic mb-2">Sell this, or sell <em>with</em> this</div>
            <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
              PromptForge works standalone as a $19/mo prosumer SaaS, but its real margin lives as an upsell.
              Bolt it into any agency offer, course, or vertical SaaS — your students or customers configure
              once and stop paying $50/hr prompt engineers. You charge a one-time setup, a monthly seat, or
              both. The taxonomy is yours to brand.
            </p>
          </div>
        </main>
      )}

      {/* =========================================================
           PAYWALL MODAL
         ========================================================= */}
      {showPay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="max-w-md w-full p-6" style={{ background: T.surface, border: `1px solid ${T.accent}` }}>
            <button onClick={() => setShowPay(false)} className="absolute top-4 right-4" style={{ color: T.muted }}>
              <X size={16} />
            </button>
            <Tag color={T.accent}><Crown size={10} /> Pro</Tag>
            <div className="display text-3xl italic mt-3 mb-1">Sharpen the forge.</div>
            <p className="text-xs mb-5" style={{ color: T.muted }}>
              Unlimited AI refine + test, unlimited library, and learning suggestions that get smarter as you rate prompts.
            </p>
            <div className="display text-5xl mb-6">$19<span className="text-base" style={{ color: T.muted }}>/mo</span></div>
            <button onClick={handleUpgrade}
              className="w-full py-3 text-xs uppercase tracking-widest font-medium mb-2"
              style={{ background: T.accent, color: T.bg }}>
              Activate Pro (demo)
            </button>
            <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: T.dim }}>
              In production: Stripe checkout → webhook → set tier
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
