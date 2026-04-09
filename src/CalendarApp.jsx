import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Trash2, Search, ChevronDown, Eye, EyeOff,
  Repeat, Plus, Clock, Calendar, GripVertical, ArrowRight, Check,
  CheckCircle, Star, Play, Pause, RotateCcw, Sun, Zap, Inbox, Folder,
  Home, Lightbulb, RefreshCw, Target, Coffee, Sparkles, Brain, Send, User,
  Minimize2, Flame, Monitor, Phone, Briefcase, Archive, Link2, Unlink,
  Menu, PanelLeftClose, Palette
} from 'lucide-react';

const DB_NAME = 'FlowMindDB';
const DB_VER = 2;
const openDB = () => new Promise((res, rej) => {
  try {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => { const db = e.target.result; ['tasks','events','projects'].forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  } catch (e) { rej(e); }
});
const dbGetAll = store => new Promise(async (res, rej) => { try { const db = await openDB(); const tx = db.transaction(store, 'readonly'); const rq = tx.objectStore(store).getAll(); rq.onsuccess = () => { res(rq.result); db.close(); }; rq.onerror = () => { rej(rq.error); db.close(); }; } catch (e) { rej(e); } });
const dbPutAll = (store, items) => new Promise(async (res, rej) => { try { const db = await openDB(); const tx = db.transaction(store, 'readwrite'); const s = tx.objectStore(store); s.clear(); items.forEach(i => s.put(i)); tx.oncomplete = () => { res(); db.close(); }; tx.onerror = () => { rej(tx.error); db.close(); }; } catch (e) { rej(e); } });

const HH = 60, SN = 15;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_MON = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const TIME_OPTS = Array.from({ length: 96 }, (_, i) => { const m = i * 15, h = Math.floor(m / 60), mi = m % 60; return { value: m, label: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` }; });
const DEFAULT_CATS = [
  { id: 'work', name: 'Work', hex: '#3b82f6' }, { id: 'personal', name: 'Personal', hex: '#10b981' },
  { id: 'meeting', name: 'Meeting', hex: '#8b5cf6' }, { id: 'deadline', name: 'Deadline', hex: '#f43f5e' },
  { id: 'event', name: 'Event', hex: '#f59e0b' },
];
const CONTEXTS = [
  { id: 'computer', label: '@Computer', icon: Monitor, color: '#6366f1' },
  { id: 'calls', label: '@Calls', icon: Phone, color: '#10b981' },
  { id: 'home', label: '@Home', icon: Home, color: '#f59e0b' },
  { id: 'errands', label: '@Errands', icon: Archive, color: '#8b5cf6' },
  { id: 'office', label: '@Office', icon: Briefcase, color: '#ef4444' },
];
const ENERGY = [
  { id: 'low', label: 'Low', icon: Coffee, color: 'text-sky-500', bg: 'bg-sky-50', fill: '#0ea5e9' },
  { id: 'medium', label: 'Medium', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', fill: '#f59e0b' },
  { id: 'high', label: 'High', icon: Flame, color: 'text-rose-500', bg: 'bg-rose-50', fill: '#ef4444' },
];
const TIME_EST = [5, 15, 30, 45, 60, 90, 120];
const REC_TYPES = [{ v: 'none', l: 'None' }, { v: 'daily', l: 'Daily' }, { v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }];
const PROJ_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const NAV_VIEWS = [
  { id: 'today', label: 'Today', icon: Sun }, { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'next', label: 'Next Actions', icon: Zap }, { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'waiting', label: 'Waiting For', icon: Clock }, { id: 'someday', label: 'Someday/Maybe', icon: Lightbulb },
  { id: 'calendar', label: 'Calendar', icon: Calendar }, { id: 'review', label: 'Weekly Review', icon: RefreshCw },
];
const REVIEW_STEPS = [
  { title: 'Clear Inbox', desc: 'Process all items.', icon: Inbox },
  { title: 'Review Projects', desc: 'Check progress.', icon: Folder },
  { title: 'Review Waiting', desc: 'Follow up.', icon: Clock },
  { title: 'Review Someday', desc: 'Promote or remove.', icon: Lightbulb },
  { title: 'Plan Next Week', desc: 'Set priorities.', icon: Calendar },
];
const spr = { type: 'spring', damping: 22, stiffness: 350 };
const sprG = { type: 'spring', damping: 25, stiffness: 300 };

const snap = m => Math.round(m / SN) * SN;
const mToY = m => (m / 60) * HH;
const yToM = y => snap(Math.max(0, Math.min((y / HH) * 60, 1440)));
const yToMR = y => Math.max(0, Math.min((y / HH) * 60, 1440));
const fmtT = m => { const h = Math.floor(m / 60), mi = Math.round(m % 60); return `${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const fmtS = m => { const h = Math.floor(m / 60), mi = Math.round(m % 60); return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`; };
const fmtD = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const fmtDO = d => fmtD(d.getFullYear(), d.getMonth(), d.getDate());
const gDIM = (y, m) => new Date(y, m + 1, 0).getDate();
const gMDOW = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const hRgba = (hex, a) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `rgba(${r},${g},${b},${a})`; };
const fmtTimer = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const suggestCtx = t => { const l = t.toLowerCase(); if (l.includes('call')) return 'calls'; if (l.includes('buy')) return 'errands'; return 'computer'; };
const suggestEn = t => { const l = t.toLowerCase(); if (l.includes('write') || l.includes('create')) return 'high'; if (l.includes('review')) return 'medium'; return 'low'; };

const toggleStInTree = (subs, id) => subs.map(s => s.id === id ? { ...s, done: !s.done } : { ...s, subtasks: s.subtasks ? toggleStInTree(s.subtasks, id) : [] });
const delStFromTree = (subs, id) => subs.filter(s => s.id !== id).map(s => ({ ...s, subtasks: s.subtasks ? delStFromTree(s.subtasks, id) : [] }));
const addStChild = (subs, pid, ns) => subs.map(s => s.id === pid ? { ...s, subtasks: [...(s.subtasks || []), ns] } : { ...s, subtasks: s.subtasks ? addStChild(s.subtasks, pid, ns) : [] });
const countSt = (subs) => { let t = 0, d = 0; for (const s of (subs || [])) { t++; if (s.done) d++; const c = countSt(s.subtasks); t += c.t; d += c.d; } return { t, d }; };

const expandRec = (base, rs, re) => {
  const r = [];
  for (const ev of base) {
    if (!ev.recurrence || ev.recurrence === 'none') { r.push({ ...ev, _bid: ev.id, _rec: false }); continue; }
    const map = { daily: 1, weekly: 7, monthly: 0 };
    const days = map[ev.recurrence];
    const recEnd = ev.recurrenceEnd ? new Date(ev.recurrenceEnd + 'T23:59:59') : null;
    const endD = recEnd && recEnd < re ? recEnd : re;
    let c = new Date(ev.date + 'T00:00:00'), cnt = 0;
    while (c <= endD && cnt < 500) {
      cnt++; if (c >= rs) r.push({ ...ev, date: fmtDO(c), _bid: ev.id, _rec: true });
      const n = new Date(c);
      if (ev.recurrence === 'monthly') n.setMonth(n.getMonth() + 1); else n.setDate(n.getDate() + days);
      if (n <= c) break; c = n;
    }
  }
  return r;
};

const layoutOL = evts => {
  if (!evts.length) return [];
  const sorted = [...evts].sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));
  const cols = [];
  sorted.forEach(ev => { let c = 0; while (cols[c] && cols[c].some(e => e.startMin < ev.endMin && e.endMin > ev.startMin)) c++; if (!cols[c]) cols[c] = []; cols[c].push(ev); ev._col = c; });
  return sorted.map(ev => { const ov = sorted.filter(e => e.startMin < ev.endMin && e.endMin > ev.startMin); return { ...ev, _totalCols: Math.max(...ov.map(e => e._col)) + 1 }; });
};

const today = new Date();
const todayStr = fmtDO(today);
const mkSt = (id, title, done, subs = []) => ({ id, title, done, subtasks: subs });

const DEF_EVENTS = [
  { id: 'e1', title: 'Team Standup', date: todayStr, startMin: 540, endMin: 570, category: 'meeting', description: 'Daily sync', recurrence: 'weekly', recurrenceEnd: '', taskId: null },
  { id: 'e2', title: 'Deep Work', date: todayStr, startMin: 600, endMin: 720, category: 'work', description: 'Focused coding', recurrence: 'none', recurrenceEnd: '', taskId: null },
  { id: 'e3', title: 'Lunch', date: todayStr, startMin: 750, endMin: 810, category: 'personal', description: '', recurrence: 'none', recurrenceEnd: '', taskId: null },
  { id: 'e4', title: 'Client Call', date: todayStr, startMin: 840, endMin: 900, category: 'meeting', description: 'Q4 discussion', recurrence: 'none', recurrenceEnd: '', taskId: null },
];

const DEF_TASKS = [
  { id: 't1', title: 'Research PM tools', notes: '', status: 'inbox', project: null, context: null, energy: null, timeEst: null, dueDate: null, priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-28' },
  { id: 't2', title: 'Call dentist', notes: '', status: 'inbox', project: null, context: null, energy: null, timeEst: null, dueDate: null, priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-29' },
  { id: 't3', title: 'Write project proposal', notes: 'Include timeline and budget', status: 'next', project: 1, context: 'computer', energy: 'high', timeEst: 90, dueDate: '2026-04-02', priority: true, delegatedTo: '', subtasks: [mkSt(1, 'Draft outline', true, [mkSt(11, 'Research competitors', true), mkSt(12, 'List key points', false)]), mkSt(2, 'Write summary', false), mkSt(3, 'Add budget section', false, [mkSt(31, 'Gather cost data', false), mkSt(32, 'Create spreadsheet', false)])], createdAt: '2026-03-25' },
  { id: 't4', title: 'Review pull requests', notes: '3 open PRs', status: 'next', project: 1, context: 'computer', energy: 'low', timeEst: 30, dueDate: '2026-03-31', priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-28' },
  { id: 't5', title: 'Order office supplies', notes: '', status: 'next', project: null, context: 'errands', energy: 'low', timeEst: 15, dueDate: '2026-04-01', priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-27' },
  { id: 't6', title: 'Prepare client presentation', notes: 'Q4 results', status: 'next', project: 2, context: 'computer', energy: 'high', timeEst: 120, dueDate: '2026-04-03', priority: true, delegatedTo: '', subtasks: [mkSt(41, 'Create slides', true), mkSt(42, 'Add charts', false)], createdAt: '2026-03-26' },
  { id: 't7', title: 'Update API docs', notes: '', status: 'next', project: 1, context: 'computer', energy: 'medium', timeEst: 60, dueDate: '2026-04-02', priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-28' },
  { id: 't8', title: 'Fix dashboard bug', notes: 'Header alignment', status: 'next', project: 1, context: 'computer', energy: 'medium', timeEst: 45, dueDate: '2026-04-01', priority: false, delegatedTo: '', subtasks: [mkSt(51, 'Reproduce bug', true), mkSt(52, 'Fix CSS', false)], createdAt: '2026-03-28' },
  { id: 't9', title: 'Design mockups from Sarah', notes: '', status: 'waiting', project: 1, context: null, energy: null, timeEst: null, dueDate: '2026-04-04', priority: false, delegatedTo: 'Sarah Chen', subtasks: [], createdAt: '2026-03-27' },
  { id: 't10', title: 'Contract review', notes: '', status: 'waiting', project: 2, context: null, energy: null, timeEst: null, dueDate: '2026-04-05', priority: true, delegatedTo: 'Legal', subtasks: [], createdAt: '2026-03-26' },
  { id: 't11', title: 'Learn Spanish', notes: '', status: 'someday', project: null, context: null, energy: null, timeEst: null, dueDate: null, priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-15' },
  { id: 't12', title: 'Build portfolio site', notes: '', status: 'someday', project: null, context: null, energy: null, timeEst: null, dueDate: null, priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-10' },
  { id: 't13', title: 'Send weekly report', notes: '', status: 'done', project: null, context: 'computer', energy: 'low', timeEst: 15, dueDate: '2026-03-29', priority: false, delegatedTo: '', subtasks: [], createdAt: '2026-03-29' },
];

const DEF_PROJECTS = [
  { id: 1, title: 'Website Redesign', desc: 'Company website overhaul', color: '#6366f1' },
  { id: 2, title: 'Q1 Marketing', desc: 'Multi-channel campaign', color: '#f59e0b' },
  { id: 3, title: 'Product Launch v2', desc: 'Next major release', color: '#10b981' },
];

function SubtaskItem({ st, onToggle, onDel, onAddChild, depth, maxD }) {
  const [exp, setExp] = useState(true);
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const hasCh = st.subtasks && st.subtasks.length > 0;
  const canNest = depth < maxD;
  return (
    <div>
      <div className="flex items-center gap-1 py-0.5 px-0.5 group rounded hover:bg-gray-50 transition" style={{ paddingLeft: depth * 16 }}>
        {hasCh ? <button onClick={e => { e.stopPropagation(); setExp(!exp); }} className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><ChevronRight size={9} className={`text-gray-400 transition-transform duration-200 ${exp ? 'rotate-90' : ''}`} /></button> : <span className="w-3.5 shrink-0" />}
        <button onClick={e => { e.stopPropagation(); onToggle(st.id); }} className="shrink-0"><div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition ${st.done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{st.done && <Check size={7} className="text-white" strokeWidth={3} />}</div></button>
        <span className={`text-xs flex-1 truncate ${st.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{st.title}</span>
        {canNest && <button onClick={e => { e.stopPropagation(); setAdding(!adding); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 p-0.5 transition-opacity"><Plus size={9} /></button>}
        <button onClick={e => { e.stopPropagation(); onDel(st.id); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-0.5 transition-opacity"><X size={9} /></button>
      </div>
      <AnimatePresence>{adding && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: (depth + 1) * 16 + 14 }}>
            <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAddChild(st.id, val.trim()); setVal(''); setAdding(false); } if (e.key === 'Escape') setAdding(false); }} placeholder="Sub-item..." className="flex-1 text-xs px-1.5 py-1 bg-white rounded border border-gray-200 outline-none focus:border-indigo-400" />
            <button onClick={() => { if (val.trim()) { onAddChild(st.id, val.trim()); setVal(''); setAdding(false); } }} className="p-1 rounded bg-gray-100 text-gray-400 hover:bg-gray-200"><Plus size={8} /></button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      {hasCh && exp && st.subtasks.map(c => <SubtaskItem key={c.id} st={c} onToggle={onToggle} onDel={onDel} onAddChild={onAddChild} depth={depth + 1} maxD={maxD} />)}
    </div>
  );
}

function MiniCal({ cd, onSelect, events, sq, setSq }) {
  const [vm, setVm] = useState(cd.month); const [vy, setVy] = useState(cd.year);
  useEffect(() => { setVm(cd.month); setVy(cd.year); }, [cd.month, cd.year]);
  const dim = gDIM(vy, vm), fd = gMDOW(vy, vm), pDim = vm === 0 ? gDIM(vy - 1, 11) : gDIM(vy, vm - 1);
  const cells = []; for (let i = fd - 1; i >= 0; i--) cells.push({ day: pDim - i, ov: true }); for (let d = 1; d <= dim; d++) cells.push({ day: d, ov: false }); const tot = Math.ceil(cells.length / 7) * 7; for (let d = 1; cells.length < tot; d++) cells.push({ day: d, ov: true });
  const rows = []; for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const t = new Date(); const isT = c => !c.ov && t.getFullYear() === vy && t.getMonth() === vm && t.getDate() === c.day;
  const isS = c => !c.ov && cd.year === vy && cd.month === vm && cd.day === c.day;
  const hasE = c => !c.ov && events.some(e => e.date === fmtD(vy, vm, c.day));
  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2"><div className="flex items-baseline gap-1"><span className="text-sm font-bold text-gray-800">{MONTHS[vm]}</span><span className="text-xs text-gray-400">{vy}</span></div>
        <div className="flex gap-0.5"><button onClick={() => { if (vm === 0) { setVm(11); setVy(vy - 1); } else setVm(vm - 1); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100"><ChevronLeft size={11} className="text-gray-400" /></button><button onClick={() => { if (vm === 11) { setVm(0); setVy(vy + 1); } else setVm(vm + 1); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100"><ChevronRight size={11} className="text-gray-400" /></button></div>
      </div>
      {setSq && <div className="relative mb-2"><input value={sq || ''} onChange={e => setSq(e.target.value)} placeholder="Search..." className="w-full pl-2.5 pr-6 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 placeholder-gray-400 focus:outline-none focus:border-indigo-300" />{sq ? <button onClick={() => setSq('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={10} /></button> : <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />}</div>}
      <div className="grid grid-cols-7 mb-0.5">{['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="text-center text-xs font-medium text-gray-400 py-0.5">{d}</div>)}</div>
      {rows.map((row, ri) => <div key={ri} className="grid grid-cols-7">{row.map((cell, ci) => { const sel = isS(cell), tod = isT(cell); return <button key={ci} onClick={() => !cell.ov && onSelect(vy, vm, cell.day)} className="relative flex items-center justify-center py-0.5"><span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition ${tod ? 'bg-indigo-500 text-white font-bold' : sel ? 'bg-indigo-100 text-indigo-700 font-semibold' : !cell.ov ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'}`}>{cell.day}</span>{!cell.ov && hasE(cell) && !sel && !tod && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}</button>; })}</div>)}
    </div>
  );
}

function EvModal({ isOpen, onClose, onSave, onDelete, event, selDate, ds, de, categories }) {
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [cat, setCat] = useState('work');
  const [rec, setRec] = useState('none'); const [recEnd, setRecEnd] = useState('');
  useEffect(() => { if (isOpen) { setTitle(event?.title || ''); setDesc(event?.description || ''); setCat(event?.category || 'work'); setRec(event?.recurrence || 'none'); setRecEnd(event?.recurrenceEnd || ''); } }, [event, isOpen]);
  if (!isOpen) return null;
  const cc = categories.find(x => x.id === cat);
  const sMin = event?.startMin ?? ds ?? 540;
  const eMin = event?.endMin ?? de ?? 600;
  const date = event?.date || selDate || todayStr;
  return (
    <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={spr} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="h-1" style={{ background: cc?.hex || '#3b82f6' }} />
        <div className="p-5 max-h-screen overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-gray-800">{event ? 'Edit Event' : 'New Event'}</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div>
          <div className="bg-indigo-50 rounded-xl px-3 py-2 mb-4 flex items-center gap-3">
            <Calendar size={14} className="text-indigo-400 shrink-0" />
            <div><p className="text-xs font-bold text-indigo-700">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p><p className="text-xs text-indigo-500 mt-0.5">{fmtT(sMin)} – {fmtT(eMin)} <span className="text-indigo-400">({Math.round(eMin - sMin)}min)</span></p></div>
          </div>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Title</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" autoFocus /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none" /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Category</label><div className="flex gap-1.5 mt-1.5 flex-wrap">{categories.map(c => <button key={c.id} onClick={() => setCat(c.id)} className="px-2.5 py-1 rounded-full text-xs font-medium transition" style={cat === c.id ? { background: c.hex, color: '#fff' } : { background: hRgba(c.hex, 0.12), color: c.hex }}>{c.name}</button>)}</div></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><Repeat size={10} />Repeat</label><div className="flex gap-1 mt-1.5">{REC_TYPES.map(o => <button key={o.v} onClick={() => setRec(o.v)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${rec === o.v ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{o.l}</button>)}</div></div>
          </div>
          <div className="flex gap-2 mt-5">
            {event && <button onClick={() => { onDelete(event.id); onClose(); }} className="px-3 py-2 rounded-xl text-sm text-rose-500 hover:bg-rose-50 flex items-center gap-1"><Trash2 size={13} />Delete</button>}
            <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
            <button onClick={() => { if (!title.trim()) return; onSave({ id: event?.id || 'e' + Date.now(), title, description: desc, date, startMin: sMin, endMin: eMin, category: cat, recurrence: rec, recurrenceEnd: recEnd, taskId: event?.taskId || null }); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600">{event ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  );
}

export default function App() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [view, setView] = useState('today');
  const [calView, setCalView] = useState('week');
  const [cd, setCd] = useState({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() });
  const [events, setEvents] = useState(DEF_EVENTS);
  const [tasks, setTasks] = useState(DEF_TASKS);
  const [projects, setProjects] = useState(DEF_PROJECTS);
  const [categories] = useState(DEFAULT_CATS);
  const [dbLoaded, setDbLoaded] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEv, setEditEv] = useState(null);
  const [selDate, setSelDate] = useState(todayStr);
  const [ds, setDs] = useState(540); const [de, setDe] = useState(600);
  const [sq, setSq] = useState('');
  const [visCats, setVisCats] = useState(DEFAULT_CATS.map(c => c.id));
  const [curEnergy, setCurEnergy] = useState('medium');
  const [ctxFilter, setCtxFilter] = useState('all');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [captureInput, setCaptureInput] = useState('');
  const [showFocus, setShowFocus] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState(null);
  const [pomSec, setPomSec] = useState(1500);
  const [pomRun, setPomRun] = useState(false);
  const [pomMode, setPomMode] = useState('work');
  const [reviewStep, setReviewStep] = useState(0);
  const [reviewChecks, setReviewChecks] = useState([false, false, false, false, false]);
  const [procTaskId, setProcTaskId] = useState(null);
  const [procStep, setProcStep] = useState(0);
  const [procCtx, setProcCtx] = useState('computer');
  const [procEnergy, setProcEnergy] = useState('medium');
  const [procTime, setProcTime] = useState(30);
  const [procProject, setProcProject] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newSubInput, setNewSubInput] = useState('');
  const [toasts, setToasts] = useState([]);
  const [dragType, setDragType] = useState(null);
  const [selection, setSelection] = useState(null);
  const [movId, setMovId] = useState(null);
  const [resId, setResId] = useState(null);
  const [selectedProjId, setSelectedProjId] = useState(null);
  const [showNewProj, setShowNewProj] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjColor, setNewProjColor] = useState('#6366f1');

  const evRef = useRef(events); useEffect(() => { evRef.current = events; }, [events]);
  const colRefs = useRef({});
  const scrollRef = useRef(null);
  const todayScrollRef = useRef(null);
  const scKey = useRef('');
  const todayScKey = useRef('');
  const dragRef = useRef({ type: null });
  const lastMouseY = useRef(0);
  const autoScrollRef = useRef(null);
  const captureRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [dt, de, dp] = await Promise.all([dbGetAll('tasks'), dbGetAll('events'), dbGetAll('projects')]);
        if (dt.length > 0) setTasks(dt);
        if (de.length > 0) setEvents(de);
        if (dp.length > 0) setProjects(dp);
      } catch (e) {}
      setDbLoaded(true);
    })();
  }, []);
  useEffect(() => { if (dbLoaded) dbPutAll('tasks', tasks).catch(() => {}); }, [tasks, dbLoaded]);
  useEffect(() => { if (dbLoaded) dbPutAll('events', events).catch(() => {}); }, [events, dbLoaded]);
  useEffect(() => { if (dbLoaded) dbPutAll('projects', projects).catch(() => {}); }, [projects, dbLoaded]);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);
  const inboxTasks = useMemo(() => tasks.filter(t => t.status === 'inbox'), [tasks]);
  const nextTasks = useMemo(() => tasks.filter(t => t.status === 'next'), [tasks]);
  const waitingTasks = useMemo(() => tasks.filter(t => t.status === 'waiting'), [tasks]);
  const somedayTasks = useMemo(() => tasks.filter(t => t.status === 'someday'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
  const overallProg = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const scheduledMap = useMemo(() => { const m = {}; events.forEach(ev => { if (ev.taskId) m[ev.taskId] = ev; }); return m; }, [events]);
  const getCat = useCallback(cid => categories.find(c => c.id === cid) || categories[0], [categories]);

  const expRange = useMemo(() => { const c = new Date(cd.year, cd.month, 15); const s = new Date(c); s.setMonth(s.getMonth() - 2); const e = new Date(c); e.setMonth(e.getMonth() + 2); return { s, e }; }, [cd.year, cd.month]);
  const expanded = useMemo(() => expandRec(events, expRange.s, expRange.e), [events, expRange]);
  const filteredEvents = useMemo(() => { const q = sq.trim().toLowerCase(); return expanded.filter(e => visCats.includes(e.category) && (!q || e.title.toLowerCase().includes(q))); }, [expanded, visCats, sq]);
  const todayEvents = useMemo(() => filteredEvents.filter(e => e.date === todayStr), [filteredEvents]);

  const weekDays = useMemo(() => {
    const d = new Date(cd.year, cd.month, cd.day); const dow = d.getDay(); const mo = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d); mon.setDate(d.getDate() + mo);
    return Array.from({ length: 7 }, (_, i) => { const dd = new Date(mon); dd.setDate(mon.getDate() + i); return { date: dd, dateStr: fmtDO(dd), dayName: DAYS_SHORT[i], dayNum: dd.getDate(), isToday: dd.toDateString() === now.toDateString() }; });
  }, [cd]);

  const calCells = useMemo(() => {
    const dim = gDIM(cd.year, cd.month), fd = gMDOW(cd.year, cd.month), pDim = cd.month === 0 ? gDIM(cd.year - 1, 11) : gDIM(cd.year, cd.month - 1);
    const c = []; for (let i = fd - 1; i >= 0; i--) c.push({ day: pDim - i, current: false, month: cd.month === 0 ? 11 : cd.month - 1, year: cd.month === 0 ? cd.year - 1 : cd.year });
    for (let d = 1; d <= dim; d++) c.push({ day: d, current: true, month: cd.month, year: cd.year });
    const rem = 42 - c.length; for (let d = 1; d <= rem; d++) c.push({ day: d, current: false, month: cd.month === 11 ? 0 : cd.month + 1, year: cd.month === 11 ? cd.year + 1 : cd.year });
    return c;
  }, [cd.year, cd.month]);

  const todaySuggested = useMemo(() => {
    return nextTasks.map(task => {
      let score = 0; if (task.priority) score += 30;
      if (task.dueDate) { const d = Math.ceil((new Date(task.dueDate) - now) / 864e5); if (d <= 1) score += 40; else if (d <= 3) score += 25; else if (d <= 7) score += 10; }
      if (task.energy === curEnergy) score += 15;
      return { ...task, score };
    }).sort((a, b) => b.score - a.score).slice(0, 10);
  }, [nextTasks, curEnergy]);

  const addToast = useCallback(msg => { const id = Date.now(); setToasts(p => [...p, { id, msg }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2500); }, []);
  useEffect(() => { if (showCapture && captureRef.current) captureRef.current.focus(); }, [showCapture]);
  useEffect(() => { if (!pomRun) return; const iv = setInterval(() => setPomSec(p => { if (p <= 1) { setPomRun(false); return 0; } return p - 1; }), 1000); return () => clearInterval(iv); }, [pomRun]);
  useEffect(() => { const h = e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return; if (e.key === 'n' && !showCapture && !modalOpen) { e.preventDefault(); setShowCapture(true); } if (e.key === 'Escape') { setShowCapture(false); setShowFocus(false); setSelectedTaskId(null); setProcTaskId(null); setModalOpen(false); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [showCapture, modalOpen]);

  const updateTask = useCallback((id, upd) => setTasks(p => p.map(t => t.id === id ? { ...t, ...upd } : t)), []);
  const deleteTask = useCallback(id => { setTasks(p => p.filter(t => t.id !== id)); if (selectedTaskId === id) setSelectedTaskId(null); }, [selectedTaskId]);
  const selectTask = id => { setSelectedTaskId(p => p === id ? null : id); setEditField(null); };
  const handleCapture = () => { if (!captureInput.trim()) return; setTasks(p => [...p, { id: 't' + Date.now(), title: captureInput.trim(), notes: '', status: 'inbox', project: null, context: null, energy: null, timeEst: null, dueDate: null, priority: false, delegatedTo: '', subtasks: [], createdAt: todayStr }]); setCaptureInput(''); setShowCapture(false); addToast('Captured to Inbox'); };
  const handleSaveEv = ev => { setEvents(p => { const i = p.findIndex(e => e.id === ev.id); return i >= 0 ? p.map((e, idx) => idx === i ? ev : e) : [...p, ev]; }); addToast(editEv ? 'Event updated' : 'Event created'); };
  const handleDelEv = id => { setEvents(p => p.filter(e => e.id !== id)); addToast('Event deleted'); };
  const addProject = () => { if (!newProjTitle.trim()) return; setProjects(p => [...p, { id: Date.now(), title: newProjTitle.trim(), desc: newProjDesc.trim(), color: newProjColor }]); setNewProjTitle(''); setNewProjDesc(''); setNewProjColor('#6366f1'); setShowNewProj(false); addToast('Project created'); };

  const handleProcess = (tid, action) => {
    if (action === 'delete') { deleteTask(tid); setProcTaskId(null); setProcStep(0); }
    else if (action === 'someday') { updateTask(tid, { status: 'someday' }); setProcTaskId(null); setProcStep(0); addToast('Moved to Someday'); }
    else if (action === 'next') { setProcStep(1); const t = tasks.find(x => x.id === tid); if (t) { setProcCtx(suggestCtx(t.title)); setProcEnergy(suggestEn(t.title)); setProcTime(suggestEn(t.title) === 'high' ? 90 : 45); setProcProject(null); } }
    else if (action === 'waiting') setProcStep(3);
    else if (action === 'confirm-next') { updateTask(tid, { status: 'next', context: procCtx, energy: procEnergy, timeEst: procTime, project: procProject }); setProcTaskId(null); setProcStep(0); addToast('Moved to Next Actions'); }
    else if (action === 'confirm-waiting') { updateTask(tid, { status: 'waiting', delegatedTo: editValue || 'Someone' }); setProcTaskId(null); setProcStep(0); setEditValue(''); addToast('Delegated'); }
  };

  const getMin = useCallback((cY, key) => { const el = colRefs.current[key]; if (!el) return 0; return yToM(cY - el.getBoundingClientRect().top); }, []);
  const getMinR = useCallback((cY, key) => { const el = colRefs.current[key]; if (!el) return 0; return yToMR(cY - el.getBoundingClientRect().top); }, []);
  const findCol = useCallback(cX => { for (const [k, el] of Object.entries(colRefs.current)) { if (!el?.isConnected) continue; const r = el.getBoundingClientRect(); if (cX >= r.left && cX <= r.right) return k; } return null; }, []);
  const bUpdate = useCallback((id, ch) => setEvents(p => p.map(e => e.id === id ? { ...e, ...ch } : e)), []);

  const getActiveScroll = useCallback(() => {
    if (view === 'today' && todayScrollRef.current) return todayScrollRef.current;
    if (scrollRef.current) return scrollRef.current;
    return null;
  }, [view]);

  const startAS = useCallback(() => { const tick = () => { const sc = getActiveScroll(); if (!sc) { autoScrollRef.current = requestAnimationFrame(tick); return; } const r = sc.getBoundingClientRect(); const y = lastMouseY.current; if (y < r.top + 50) sc.scrollTop -= 8; else if (y > r.bottom - 50) sc.scrollTop += 8; autoScrollRef.current = requestAnimationFrame(tick); }; autoScrollRef.current = requestAnimationFrame(tick); }, [getActiveScroll]);
  const stopAS = useCallback(() => { if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; } }, []);

  const onColDown = useCallback((e, dateStr) => {
    if (e.button !== 0 || modalOpen) return;
    const resEl = e.target.closest('[data-resize]'); const evEl = e.target.closest('[data-event-id]');
    if (resEl) { e.preventDefault(); e.stopPropagation(); const par = resEl.closest('[data-event-id]'); const eid = par.dataset.eventId; dragRef.current = { type: `resize-${resEl.dataset.resize}`, eventId: eid, dateStr }; setDragType(`resize-${resEl.dataset.resize}`); setResId(eid); startAS(); }
    else if (evEl) { e.preventDefault(); const eid = evEl.dataset.eventId; if (evEl.dataset.recurring === 'true') { const b = evRef.current.find(x => x.id === eid); if (b) { setEditEv({ ...b }); setModalOpen(true); } return; } const ev = evRef.current.find(x => x.id === eid); if (!ev) return; const min = getMinR(e.clientY, dateStr); dragRef.current = { type: 'move', eventId: eid, dateStr, offMin: min - ev.startMin, moved: false, origDate: ev.date, origStart: ev.startMin, origEnd: ev.endMin }; setDragType('move'); setMovId(eid); startAS(); }
    else { e.preventDefault(); const min = getMin(e.clientY, dateStr); dragRef.current = { type: 'create', dateStr, startMin: min, curMin: min }; setDragType('create'); setSelection({ dateStr, startMin: min, endMin: min + SN }); startAS(); }
  }, [getMin, getMinR, modalOpen, startAS]);

  const onMM = useCallback(e => {
    lastMouseY.current = e.clientY; const d = dragRef.current; if (!d.type) return; const hk = findCol(e.clientX);
    if (d.type === 'create') { const min = getMin(e.clientY, hk || d.dateStr); d.curMin = min; const s = Math.min(d.startMin, min), en = Math.max(d.startMin, min) + SN; setSelection({ dateStr: d.dateStr, startMin: s, endMin: Math.min(en, 1440) }); }
    else if (d.type === 'move' && hk) { d.moved = true; const raw = getMinR(e.clientY, hk); const ev = evRef.current.find(x => x.id === d.eventId); if (!ev) return; const dur = ev.endMin - ev.startMin; bUpdate(d.eventId, { date: hk, startMin: Math.max(0, Math.min(raw - d.offMin, 1440 - dur)), endMin: Math.max(0, Math.min(raw - d.offMin, 1440 - dur)) + dur }); }
    else if (d.type === 'resize-bottom' && hk) { const raw = getMinR(e.clientY, hk); const ev = evRef.current.find(x => x.id === d.eventId); if (ev) bUpdate(d.eventId, { endMin: Math.min(Math.max(raw, ev.startMin + 5), 1440) }); }
    else if (d.type === 'resize-top' && hk) { const raw = getMinR(e.clientY, hk); const ev = evRef.current.find(x => x.id === d.eventId); if (ev) bUpdate(d.eventId, { startMin: Math.max(0, Math.min(raw, ev.endMin - 5)) }); }
  }, [findCol, getMin, getMinR, bUpdate]);

  const pSnap = useCallback(eid => { requestAnimationFrame(() => { const ev = evRef.current.find(x => x.id === eid); if (ev) { let ss = snap(ev.startMin), se = snap(ev.endMin); if (se <= ss) se = ss + SN; bUpdate(eid, { startMin: ss, endMin: se }); } }); }, [bUpdate]);

  const onMU = useCallback(() => {
    stopAS(); const d = dragRef.current; if (!d.type) return;
    if (d.type === 'create') { const s = Math.min(d.startMin, d.curMin ?? d.startMin), en = Math.max(d.startMin, d.curMin ?? d.startMin) + SN; setDs(s); setDe(Math.min(en, 1440)); setSelDate(d.dateStr); setEditEv(null); setModalOpen(true); }
    else if (d.type === 'move') { if (!d.moved) { const ev = evRef.current.find(x => x.id === d.eventId); if (ev) { setEditEv({ ...ev }); setModalOpen(true); } } else pSnap(d.eventId); }
    else if (d.type.startsWith('resize')) pSnap(d.eventId);
    dragRef.current = { type: null }; setDragType(null); setSelection(null); setMovId(null); setResId(null);
  }, [stopAS, pSnap]);

  useEffect(() => { window.addEventListener('mousemove', onMM); window.addEventListener('mouseup', onMU); return () => { window.removeEventListener('mousemove', onMM); window.removeEventListener('mouseup', onMU); }; }, [onMM, onMU]);

  const nav = d => { setCd(p => { if (calView === 'month') { let m = p.month + d, y = p.year; if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; } return { ...p, year: y, month: m }; } else if (calView === 'week') { const dt = new Date(p.year, p.month, p.day + d * 7); return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate() }; } else { const dt = new Date(p.year, p.month, p.day + d); return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate() }; } }); };
  const goToday = () => setCd({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() });

  const setSEl = useCallback(el => { scrollRef.current = el; const k = `cal-${calView}-${cd.year}-${cd.month}-${cd.day}`; if (el && k !== scKey.current) { scKey.current = k; el.scrollTop = mToY(7.5 * 60); } }, [calView, cd]);
  const setTodaySEl = useCallback(el => { todayScrollRef.current = el; const k = `today-scroll`; if (el && k !== todayScKey.current) { todayScKey.current = k; el.scrollTop = mToY(Math.max(0, nowMin - 60)); } }, []);

  const renderCol = (dateStr, dayEvs, isToday, fullWidth) => {
    const activeId = movId || resId;
    const staticEvs = activeId ? dayEvs.filter(ev => (ev._bid || ev.id) !== activeId) : dayEvs;
    const activeEvts = activeId ? dayEvs.filter(ev => (ev._bid || ev.id) === activeId) : [];
    const laid = layoutOL(staticEvs);
    return (
      <div key={dateStr} ref={el => { colRefs.current[dateStr] = el; }} className={`relative flex-1 ${fullWidth ? '' : 'border-r border-gray-100'} ${isToday ? 'bg-indigo-50/20' : ''}`} style={{ minHeight: HH * 24 }} onMouseDown={e => onColDown(e, dateStr)}>
        {HOURS.map(h => <React.Fragment key={h}><div className="absolute w-full border-b border-gray-100" style={{ top: h * HH, height: HH }} /><div className="absolute w-full border-b border-gray-50 border-dashed" style={{ top: h * HH + HH / 2 }} /></React.Fragment>)}
        {isToday && <div className="absolute w-full z-30 pointer-events-none" style={{ top: mToY(nowMin) }}><div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 shadow-sm relative"><div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-30" /></div><div className="flex-1 h-0.5 bg-gradient-to-r from-rose-500 to-transparent" /></div></div>}
        {selection && selection.dateStr === dateStr && <div className="absolute left-1 right-1 rounded-lg z-10 pointer-events-none border-2 border-dashed border-indigo-400" style={{ top: mToY(selection.startMin), height: Math.max(mToY(selection.endMin - selection.startMin), 16), background: 'rgba(99,102,241,0.08)' }}><div className="px-2 py-0.5 text-xs font-bold text-indigo-500">{fmtT(selection.startMin)} – {fmtT(selection.endMin)}</div></div>}
        {laid.map((ev) => {
          const top = mToY(ev.startMin), height = Math.max(mToY(ev.endMin - ev.startMin), 24);
          const c = getCat(ev.category); const isRec = ev._rec; const evId = ev._bid || ev.id;
          const colW = 100 / ev._totalCols, colL = ev._col * colW; const isLinked = ev.taskId != null;
          return (
            <div key={`${evId}-${ev.date}-${ev._col}`} data-event-id={evId} data-recurring={isRec ? 'true' : undefined} className="absolute overflow-hidden text-white group" style={{ top, height, left: `calc(${colL}% + 2px)`, width: `calc(${colW}% - 4px)`, zIndex: 20, cursor: isRec ? 'pointer' : 'grab', borderRadius: 8 }}>
              <div className="absolute inset-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${c.hex}, ${hRgba(c.hex, 0.7)})` }}><div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" style={{ height: '40%' }} /></div>
              {!isRec && <div data-resize="top" className="absolute top-0 inset-x-0 h-2 z-30 cursor-ns-resize" />}
              <div className="relative px-2 py-1 pointer-events-none overflow-hidden" style={{ height: height - 8 }}>
                <div className="text-xs font-bold leading-tight truncate flex items-center gap-0.5">{isRec && <Repeat size={8} className="opacity-70 shrink-0" />}{isLinked && <Link2 size={8} className="opacity-70 shrink-0" />}{ev.title}</div>
                {height >= 40 && <div className="text-xs opacity-80 mt-0.5">{fmtS(ev.startMin)} – {fmtS(ev.endMin)}</div>}
              </div>
              {!isRec && <div data-resize="bottom" className="absolute bottom-0 inset-x-0 h-2 z-30 cursor-ns-resize" />}
            </div>
          );
        })}
        {activeEvts.map(ev => {
          const top = mToY(ev.startMin), height = Math.max(mToY(ev.endMin - ev.startMin), 24); const c = getCat(ev.category); const evId = ev._bid || ev.id;
          return (
            <div key={`a-${evId}`} data-event-id={evId} className="absolute left-1 right-1 overflow-hidden text-white" style={{ top, height, zIndex: 50, borderRadius: 10, cursor: movId ? 'grabbing' : 'ns-resize', transform: 'scale(1.02)', boxShadow: `0 12px 30px rgba(0,0,0,0.3), 0 0 0 2px ${hRgba(c.hex, 0.5)}` }}>
              <div className="absolute inset-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${c.hex}, ${hRgba(c.hex, 0.7)})` }} />
              <div data-resize="top" className="absolute top-0 inset-x-0 h-2.5 z-30 cursor-ns-resize" />
              <div className="relative px-2 py-1 pointer-events-none"><div className="text-xs font-bold truncate">{ev.title}</div>{height >= 40 && <div className="text-xs opacity-80 mt-0.5">{fmtS(ev.startMin)} – {fmtS(ev.endMin)}</div>}</div>
              <div data-resize="bottom" className="absolute bottom-0 inset-x-0 h-2.5 z-30 cursor-ns-resize" />
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedTask) return <div className="flex flex-col items-center justify-center h-full p-6"><div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-2"><Eye size={18} className="text-gray-300" /></div><p className="text-sm text-gray-400">Select a task</p></div>;
    const stCount = countSt(selectedTask.subtasks);
    const proj = projects.find(p => p.id === selectedTask.project);
    const schEv = scheduledMap[selectedTask.id];
    const en = ENERGY.find(e => e.id === selectedTask.energy);
    const handleStToggle = id => updateTask(selectedTask.id, { subtasks: toggleStInTree(selectedTask.subtasks, id) });
    const handleStDel = id => updateTask(selectedTask.id, { subtasks: delStFromTree(selectedTask.subtasks, id) });
    const handleStAddChild = (pid, title) => updateTask(selectedTask.id, { subtasks: addStChild(selectedTask.subtasks, pid, { id: Date.now() + Math.random(), title, done: false, subtasks: [] }) });
    return (
      <div className="p-4 overflow-y-auto h-full" style={{ scrollbarWidth: 'none' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase">Detail</p>
          <div className="flex items-center gap-0.5">
            <button onClick={() => { setFocusTaskId(selectedTask.id); setShowFocus(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-indigo-500"><Play size={12} /></button>
            <button onClick={() => updateTask(selectedTask.id, { priority: !selectedTask.priority })} className="p-1.5 rounded-lg hover:bg-gray-100"><Star size={12} className={selectedTask.priority ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} /></button>
            <button onClick={() => deleteTask(selectedTask.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={12} /></button>
            <button onClick={() => { setSelectedTaskId(null); setEditField(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={12} /></button>
          </div>
        </div>
        {editField === 'title' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => { if (editValue.trim()) updateTask(selectedTask.id, { title: editValue.trim() }); setEditField(null); }} onKeyDown={e => { if (e.key === 'Enter') { if (editValue.trim()) updateTask(selectedTask.id, { title: editValue.trim() }); setEditField(null); } }} className="text-base font-extrabold text-gray-900 bg-gray-50 rounded-xl px-3 py-2 w-full outline-none border border-gray-200 mb-3" />
        : <h2 onClick={() => { setEditField('title'); setEditValue(selectedTask.title); }} className="text-base font-extrabold text-gray-900 mb-2 cursor-pointer hover:text-indigo-600 transition leading-snug">{selectedTask.title}</h2>}
        <div className="flex flex-wrap gap-1 mb-3">
          {proj && <span className="text-white px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: proj.color }}>{proj.title}</span>}
          {en && (() => { const I = en.icon; return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium ${en.bg} ${en.color}`}><I size={9} />{en.label}</span>; })()}
          {selectedTask.timeEst && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600"><Clock size={9} />{selectedTask.timeEst}m</span>}
        </div>
        {schEv && <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 mb-3 flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0"><Calendar size={11} className="text-white" /></div><div className="flex-1"><p className="text-xs font-bold text-indigo-700">Scheduled {fmtS(schEv.startMin)} – {fmtS(schEv.endMin)}</p></div><button onClick={() => setEvents(p => p.filter(ev => ev.id !== schEv.id))} className="text-indigo-400 hover:text-red-500 p-1"><Unlink size={10} /></button></div>}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Notes</label>
            {editField === 'notes' ? <textarea autoFocus value={editValue} onChange={e => { setEditValue(e.target.value); updateTask(selectedTask.id, { notes: e.target.value }); }} onBlur={() => setEditField(null)} className="w-full bg-gray-50 text-sm rounded-xl p-2.5 outline-none border border-gray-200 resize-none" style={{ minHeight: 50 }} />
            : <div onClick={() => { setEditField('notes'); setEditValue(selectedTask.notes); }} className="bg-gray-50 rounded-xl p-2.5 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 border border-gray-100" style={{ minHeight: 32 }}>{selectedTask.notes || <span className="text-gray-400 italic">Add notes...</span>}</div>}
          </div>
          <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Status</label><div className="flex flex-wrap gap-1">{['next', 'waiting', 'someday', 'done'].map(s => <button key={s} onClick={() => updateTask(selectedTask.id, { status: s })} className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize transition ${selectedTask.status === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{s === 'someday' ? 'Someday' : s}</button>)}</div></div>
          <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Project</label><div className="flex flex-wrap gap-1"><button onClick={() => updateTask(selectedTask.id, { project: null })} className={`px-2 py-1 rounded-lg text-xs font-medium transition ${selectedTask.project === null ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>None</button>{projects.map(p => <button key={p.id} onClick={() => updateTask(selectedTask.id, { project: p.id })} className="px-2 py-1 rounded-lg text-xs font-medium transition" style={selectedTask.project === p.id ? { background: p.color, color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>{p.title}</button>)}</div></div>
          <div>
            <div className="flex items-center justify-between mb-1"><label className="text-xs font-bold text-gray-400 uppercase">Subtasks ({stCount.d}/{stCount.t})</label></div>
            {stCount.t > 0 && <div className="w-full bg-gray-100 rounded-full h-1 mb-1.5 overflow-hidden"><div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${stCount.t > 0 ? (stCount.d / stCount.t) * 100 : 0}%` }} /></div>}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-1.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {selectedTask.subtasks.length === 0 && <p className="text-xs text-gray-400 text-center py-2 italic">No subtasks</p>}
              {selectedTask.subtasks.map(s => <SubtaskItem key={s.id} st={s} onToggle={handleStToggle} onDel={handleStDel} onAddChild={handleStAddChild} depth={0} maxD={4} />)}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <input value={newSubInput} onChange={e => setNewSubInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSubInput.trim()) { updateTask(selectedTask.id, { subtasks: [...selectedTask.subtasks, { id: Date.now() + Math.random(), title: newSubInput.trim(), done: false, subtasks: [] }] }); setNewSubInput(''); } }} placeholder="Add subtask..." className="flex-1 text-xs px-2 py-1.5 bg-white rounded-lg outline-none border border-gray-200 focus:border-indigo-400" />
              <button onClick={() => { if (!newSubInput.trim()) return; updateTask(selectedTask.id, { subtasks: [...selectedTask.subtasks, { id: Date.now() + Math.random(), title: newSubInput.trim(), done: false, subtasks: [] }] }); setNewSubInput(''); }} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400"><Plus size={10} /></button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setFocusTaskId(selectedTask.id); setShowFocus(true); }} className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-indigo-200"><Play size={11} />Focus</button>
            <button onClick={() => updateTask(selectedTask.id, { status: selectedTask.status === 'done' ? 'next' : 'done' })} className={`py-2 px-3 text-sm font-bold rounded-xl flex items-center gap-1 border transition ${selectedTask.status === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-600'}`}><CheckCircle size={11} />{selectedTask.status === 'done' ? 'Done' : 'Complete'}</button>
          </div>
        </div>
      </div>
    );
  };

  const TaskRow = ({ task, showProject = true }) => {
    const isDone = task.status === 'done';
    const stC = countSt(task.subtasks);
    const schEv = scheduledMap[task.id];
    const accent = task.priority ? '#ef4444' : task.energy === 'high' ? '#ef4444' : task.energy === 'medium' ? '#f59e0b' : '#38bdf8';
    return (
      <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={spr}
        className={`relative rounded-xl border cursor-pointer overflow-hidden transition-shadow ${selectedTaskId === task.id ? 'bg-indigo-50 border-indigo-200 shadow-md' : isDone ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
        onClick={() => selectTask(task.id)}>
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent, opacity: isDone ? 0.3 : 1 }} />
        <div className="pl-3 pr-2.5 py-2">
          <div className="flex items-start gap-2">
            <button onClick={e => { e.stopPropagation(); updateTask(task.id, { status: isDone ? 'next' : 'done' }); }} className="mt-0.5 shrink-0"><div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${isDone ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 hover:border-indigo-400'}`}>{isDone && <Check size={9} className="text-white" strokeWidth={3} />}</div></button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {showProject && task.project && (() => { const p = projects.find(x => x.id === task.project); return p ? <span className="text-white px-1 py-0.5 rounded text-xs font-bold" style={{ background: p.color, fontSize: 10 }}>{p.title}</span> : null; })()}
                {task.energy && (() => { const e = ENERGY.find(x => x.id === task.energy); if (!e) return null; const I = e.icon; return <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-medium ${e.bg} ${e.color}`}><I size={8} />{e.label}</span>; })()}
                {task.timeEst && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={8} />{task.timeEst}m</span>}
                {stC.t > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{stC.d}/{stC.t}</span>}
                {schEv && <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-600"><Calendar size={8} />{fmtS(schEv.startMin)}</span>}
                {task.delegatedTo && <span className="text-xs text-violet-500 flex items-center gap-0.5"><User size={8} />{task.delegatedTo}</span>}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              {task.priority && <Star size={10} className="text-amber-400 fill-amber-400" />}
              <ChevronRight size={12} className={selectedTaskId === task.id ? 'text-indigo-500' : 'text-gray-200'} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ═══ TODAY VIEW ═══
  const renderTodayView = () => {
    const isDetOpen = selectedTaskId !== null;
    return (
      <div className="flex flex-1 overflow-hidden">
        {/* Daily Timeline */}
        <div className="flex flex-col shrink-0 border-r border-gray-200 bg-white" style={{ width: 260 }}>
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Calendar size={13} className="text-indigo-500" />
            <span className="text-xs font-bold text-gray-700">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <span className="text-xs text-gray-400 ml-auto">{todayEvents.length} events</span>
          </div>
          <div ref={setTodaySEl} className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex" style={{ minHeight: HH * 24 }}>
              <div className="w-10 shrink-0 relative border-r border-gray-100">
                {HOURS.map(h => <div key={h} className="absolute right-1.5 text-xs text-gray-300 font-medium" style={{ top: h * HH - 6, fontSize: 10 }}>{h === 0 ? '' : `${String(h).padStart(2, '0')}`}</div>)}
              </div>
              {renderCol(todayStr, todayEvents, true, true)}
            </div>
          </div>
        </div>

        {/* Task List */}
        <motion.div className="h-full flex flex-col overflow-hidden bg-gray-50" animate={{ flex: isDetOpen ? '0 0 380px' : '1 1 auto' }} transition={sprG}>
          <div className="shrink-0 px-5 pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><h1 className="font-extrabold text-gray-900 text-lg">Today's Focus</h1></div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 bg-white rounded-lg px-1.5 py-1 border border-gray-200 shadow-sm">
                  {ENERGY.map(l => { const I = l.icon; return <button key={l.id} onClick={() => setCurEnergy(l.id)} className={`px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-0.5 transition ${curEnergy === l.id ? `${l.bg} ${l.color}` : 'text-gray-400'}`}><I size={9} />{l.label}</button>; })}
                </div>
                <button onClick={() => setShowCapture(true)} className="px-2.5 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 flex items-center gap-1 shadow-sm"><Plus size={12} />Add</button>
              </div>
            </div>
            <div className="mt-2"><div className="flex items-center justify-between mb-0.5"><span className="text-xs text-gray-400">{doneTasks.length}/{tasks.length} done</span><span className="text-xs font-bold text-indigo-500">{overallProg}%</span></div><div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all" style={{ width: `${overallProg}%` }} /></div></div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
            <div className="space-y-1.5">{todaySuggested.map(t => <TaskRow key={t.id} task={t} />)}{todaySuggested.length === 0 && <div className="text-center py-12"><Sun size={20} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No tasks for today</p></div>}</div>
          </div>
        </motion.div>

        {/* Detail Panel */}
        <AnimatePresence mode="wait">{isDetOpen && selectedTask && (
          <motion.div key={selectedTask.id} initial={{ opacity: 0, x: 60, flex: '0 0 0px' }} animate={{ opacity: 1, x: 0, flex: '1 1 auto' }} exit={{ opacity: 0, x: 60, flex: '0 0 0px' }} transition={sprG} className="h-full bg-white overflow-hidden border-l border-gray-200">{renderDetail()}</motion.div>
        )}</AnimatePresence>
      </div>
    );
  };

  const renderInboxView = () => (
    <div>
      <div className="flex items-center gap-2 mb-4"><Inbox size={18} className="text-gray-400" /><h2 className="text-lg font-bold text-gray-800">Inbox</h2><span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{inboxTasks.length}</span></div>
      {inboxTasks.length === 0 ? <div className="text-center py-14"><Inbox size={20} className="text-gray-300 mx-auto mb-2" /><p className="text-gray-500 font-semibold">Inbox Zero!</p></div> : (
        <div className="space-y-2"><AnimatePresence>{inboxTasks.map(task => (
          <motion.div key={task.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={spr} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 group hover:shadow-md transition">
            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{task.title}</p><p className="text-xs text-gray-400 mt-0.5">{task.createdAt}</p></div>
            <button onClick={() => { setProcTaskId(task.id); setProcStep(0); }} className="px-2 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-indigo-600"><Brain size={10} />Process</button>
            <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
          </motion.div>
        ))}</AnimatePresence></div>
      )}
    </div>
  );

  const renderNextView = () => {
    const filtered = ctxFilter === 'all' ? nextTasks : nextTasks.filter(t => t.context === ctxFilter);
    return (
      <div>
        <div className="flex items-center gap-2 mb-4"><Zap size={18} className="text-gray-400" /><h2 className="text-lg font-bold text-gray-800">Next Actions</h2><span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{nextTasks.length}</span></div>
        <div className="flex gap-1 mb-4 flex-wrap"><button onClick={() => setCtxFilter('all')} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${ctxFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>All</button>{CONTEXTS.map(ctx => { const I = ctx.icon; return <button key={ctx.id} onClick={() => setCtxFilter(ctx.id)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${ctxFilter === ctx.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}><I size={10} />{ctx.label}</button>; })}</div>
        {filtered.length === 0 ? <p className="text-center py-14 text-gray-400">No actions</p> : <div className="space-y-1.5"><AnimatePresence>{filtered.map(t => <TaskRow key={t.id} task={t} />)}</AnimatePresence></div>}
      </div>
    );
  };

  const renderProjectsView = () => (
    <div>
      <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Folder size={18} className="text-gray-400" /><h2 className="text-lg font-bold text-gray-800">Projects</h2></div><button onClick={() => setShowNewProj(!showNewProj)} className="px-2.5 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-indigo-600"><Plus size={12} />New Project</button></div>
      <AnimatePresence>{showNewProj && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
            <input value={newProjTitle} onChange={e => setNewProjTitle(e.target.value)} placeholder="Project name..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" autoFocus onKeyDown={e => { if (e.key === 'Enter') addProject(); }} />
            <input value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} placeholder="Description (optional)..." className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
            <div><label className="text-xs font-semibold text-gray-500 block mb-1">Color</label><div className="flex gap-1.5 flex-wrap">{PROJ_COLORS.map(c => <button key={c} onClick={() => setNewProjColor(c)} className="w-6 h-6 rounded-full transition-shadow" style={{ background: c, boxShadow: newProjColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' }} />)}</div></div>
            <div className="flex gap-2"><button onClick={addProject} className="px-4 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600">Create</button><button onClick={() => setShowNewProj(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button></div>
          </div>
        </motion.div>
      )}</AnimatePresence>
      <div className="space-y-3">{projects.map(proj => {
        const pts = tasks.filter(t => t.project === proj.id); const done = pts.filter(t => t.status === 'done').length; const pct = pts.length > 0 ? Math.round((done / pts.length) * 100) : 0; const isOpen = selectedProjId === proj.id;
        return (
          <div key={proj.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="p-3 cursor-pointer" onClick={() => setSelectedProjId(isOpen ? null : proj.id)}>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: proj.color }} /><div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 text-sm">{proj.title}</h3><p className="text-xs text-gray-400">{proj.desc}</p></div><span className="text-sm font-bold text-gray-700">{pct}%</span><motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={14} className="text-gray-400" /></motion.div></div>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-2 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: proj.color }} /></div>
            </div>
            <AnimatePresence>{isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 p-2 overflow-hidden space-y-1">{pts.length === 0 ? <p className="text-xs text-gray-400 text-center py-3">No tasks</p> : pts.map(t => <TaskRow key={t.id} task={t} showProject={false} />)}</motion.div>}</AnimatePresence>
          </div>
        );
      })}</div>
    </div>
  );

  const renderWaitingView = () => (<div><div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-gray-400" /><h2 className="text-lg font-bold text-gray-800">Waiting For</h2><span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{waitingTasks.length}</span></div>{waitingTasks.length === 0 ? <p className="text-center py-14 text-gray-400">Nothing pending</p> : <div className="space-y-1.5">{waitingTasks.map(t => <TaskRow key={t.id} task={t} />)}</div>}</div>);

  const renderSomedayView = () => (<div><div className="flex items-center gap-2 mb-4"><Lightbulb size={18} className="text-gray-400" /><h2 className="text-lg font-bold text-gray-800">Someday / Maybe</h2></div>{somedayTasks.length === 0 ? <p className="text-center py-14 text-gray-400">No ideas yet</p> : <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">{somedayTasks.map(task => <div key={task.id} className="flex items-center gap-3 p-3 group hover:bg-gray-50 cursor-pointer transition" onClick={() => selectTask(task.id)}><Lightbulb size={13} className="text-amber-400 shrink-0" /><div className="flex-1"><p className="text-sm font-medium text-gray-700">{task.title}</p></div><button onClick={e => { e.stopPropagation(); updateTask(task.id, { status: 'next', context: suggestCtx(task.title), energy: suggestEn(task.title), timeEst: 30 }); addToast('Activated'); }} className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg flex items-center gap-1"><ArrowRight size={9} />Activate</button></div>)}</div>}</div>);

  const renderCalendarView = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
        <div className="flex items-center gap-1"><button onClick={() => nav(-1)} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={14} className="text-gray-400" /></button><button onClick={() => nav(1)} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={14} className="text-gray-400" /></button></div>
        <div className="flex items-baseline gap-1.5"><h1 className="text-lg font-bold text-gray-800">{MONTHS[cd.month]}</h1><span className="text-sm text-gray-400">{cd.year}</span></div>
        <button onClick={goToday} className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50">Today</button>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">{['week', 'month'].map(v => <button key={v} onClick={() => setCalView(v)} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${calView === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>{v === 'week' ? 'Week' : 'Month'}</button>)}</div>
      </div>
      {calView === 'week' && <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-200 shrink-0"><div className="w-12 shrink-0 border-r border-gray-100" />{weekDays.map(d => <div key={d.dateStr} className={`flex-1 py-2 text-center border-r border-gray-100 cursor-pointer hover:bg-gray-50 ${d.isToday ? 'bg-indigo-50/30' : ''}`} onClick={() => setCd({ year: d.date.getFullYear(), month: d.date.getMonth(), day: d.date.getDate() })}><div className="text-xs text-gray-400 uppercase">{d.dayName}</div><div className={`text-lg font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${d.isToday ? 'bg-indigo-500 text-white' : 'text-gray-700'}`}>{d.dayNum}</div></div>)}</div>
        <div ref={setSEl} className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }}><div className="flex" style={{ minHeight: HH * 24 }}><div className="w-12 shrink-0 relative border-r border-gray-100">{HOURS.map(h => <div key={h} className="absolute right-2 text-xs text-gray-300" style={{ top: h * HH - 6 }}>{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}</div>)}</div>{weekDays.map(d => renderCol(d.dateStr, filteredEvents.filter(e => e.date === d.dateStr), d.isToday, false))}</div></div>
      </div>}
      {calView === 'month' && <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 mb-1">{DAYS_MON.map(d => <div key={d} className="text-center py-1 text-xs font-medium text-gray-400">{d}</div>)}</div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-0.5 overflow-hidden">{calCells.map((cell, i) => {
          const dstr = fmtD(cell.year, cell.month, cell.day); const dayEvs = filteredEvents.filter(e => e.date === dstr).sort((a, b) => a.startMin - b.startMin); const isT = dstr === todayStr;
          return <div key={i} onClick={() => { setCd({ year: cell.year, month: cell.month, day: cell.day }); setCalView('week'); }} className="rounded-lg p-1 cursor-pointer overflow-hidden bg-white border border-gray-100 hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-0.5 px-0.5"><span className={`text-xs ${isT ? 'font-bold bg-indigo-500 text-white rounded-md px-1' : cell.current ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>{cell.day}</span>{dayEvs.length > 0 && <span className="text-gray-400" style={{ fontSize: 8 }}>{dayEvs.length}</span>}</div>
            {dayEvs.slice(0, 2).map((ev, idx) => <div key={idx} className="px-1 py-0.5 rounded text-white font-medium truncate" style={{ background: getCat(ev.category).hex, fontSize: 9 }}>{ev.title}</div>)}
            {dayEvs.length > 2 && <div className="text-gray-400 px-0.5" style={{ fontSize: 8 }}>+{dayEvs.length - 2}</div>}
          </div>;
        })}</div>
      </div>}
    </div>
  );

  const renderReviewView = () => {
    const done = reviewChecks.filter(Boolean).length;
    return (
      <div><div className="flex items-center gap-2 mb-4"><RefreshCw size={18} className="text-gray-400" /><h2 className="text-lg font-bold text-gray-800">Weekly Review</h2></div>
        <div className="flex gap-3 mb-4"><div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-3 text-white flex-1"><p className="text-xs font-bold uppercase opacity-80">Streak</p><p className="text-lg font-extrabold mt-1">3 weeks 🔥</p></div><div className="bg-white rounded-xl border border-gray-200 p-3 flex-1"><p className="text-xs font-bold uppercase text-gray-400">Stats</p><div className="flex gap-4 mt-1"><div><p className="text-lg font-bold text-gray-800">{inboxTasks.length}</p><p className="text-xs text-gray-400">Inbox</p></div><div><p className="text-lg font-bold text-gray-800">{nextTasks.length}</p><p className="text-xs text-gray-400">Actions</p></div></div></div></div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2"><div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(done / 5) * 100}%` }} /></div><span className="text-xs font-semibold text-gray-500">{done}/5</span></div>
          {REVIEW_STEPS.map((step, i) => { const SI = step.icon; return <div key={i} className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 cursor-pointer transition ${reviewStep === i ? 'bg-indigo-50' : 'hover:bg-gray-50'}`} onClick={() => setReviewStep(i)}><button onClick={e => { e.stopPropagation(); setReviewChecks(p => { const n = [...p]; n[i] = !n[i]; return n; }); }}>{reviewChecks[i] ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check size={10} className="text-white" /></div> : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}</button><div className="flex-1"><div className="flex items-center gap-1.5"><SI size={12} className="text-gray-400" /><h3 className={`text-sm font-bold ${reviewChecks[i] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{step.title}</h3></div><p className="text-xs text-gray-400 mt-0.5">{step.desc}</p></div></div>; })}
        </div>
      </div>
    );
  };

  const viewRenderers = { inbox: renderInboxView, next: renderNextView, projects: renderProjectsView, waiting: renderWaitingView, someday: renderSomedayView, review: renderReviewView };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <AnimatePresence>{!sideCollapsed && (
        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={sprG} className="bg-gray-900 flex flex-col shrink-0 z-40 overflow-hidden">
          <div className="p-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg"><Target size={12} className="text-white" /></div>
            <span className="text-white font-extrabold text-sm whitespace-nowrap">FlowMind</span>
            <button onClick={() => setSideCollapsed(true)} className="ml-auto text-gray-500 hover:text-white shrink-0"><PanelLeftClose size={14} /></button>
          </div>
          <div className="px-1.5 flex-1 overflow-y-auto mt-0.5" style={{ scrollbarWidth: 'none' }}>
            {NAV_VIEWS.map(n => {
              const NI = n.icon; const active = view === n.id;
              const badge = n.id === 'inbox' ? inboxTasks.length : n.id === 'waiting' ? waitingTasks.length : null;
              return (
                <button key={n.id} onClick={() => { setView(n.id); if (n.id !== 'today') setSelectedTaskId(null); }} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl mb-0.5 transition text-left ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                  <NI size={15} className="shrink-0" /><span className="text-sm font-medium flex-1 truncate">{n.label}</span>{badge > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0 ${active ? 'bg-white/20' : 'bg-gray-700 text-gray-300'}`}>{badge}</span>}
                </button>
              );
            })}
          </div>
          <div className="p-2.5 border-t border-gray-800"><div className="flex items-center gap-2 px-1"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">JD</div><div className="min-w-0"><p className="text-xs text-white font-medium truncate">John Doe</p></div></div></div>
        </motion.aside>
      )}</AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-11 shrink-0 border-b border-gray-200 bg-white flex items-center px-3 gap-2">
          <button onClick={() => setSideCollapsed(!sideCollapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><Menu size={16} /></button>
          <div className="w-px h-5 bg-gray-200" />
          <span className="text-sm font-semibold text-gray-700 capitalize">{NAV_VIEWS.find(n => n.id === view)?.label || view}</span>
          <div className="flex-1" />
          <button onClick={() => setShowCapture(true)} className="px-2.5 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 flex items-center gap-1 shadow-sm"><Plus size={12} />Capture</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {view === 'today' ? renderTodayView() : view === 'calendar' ? (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-hidden p-4 flex flex-col">{renderCalendarView()}</div>
              <AnimatePresence>{selectedTask && <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={sprG} className="shrink-0 overflow-hidden bg-white border-l border-gray-200"><div style={{ width: 300 }} className="h-full">{renderDetail()}</div></motion.div>}</AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}><div className="max-w-2xl mx-auto p-5 pb-20"><AnimatePresence mode="wait"><motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{viewRenderers[view]?.()}</motion.div></AnimatePresence></div></div>
              <AnimatePresence>{selectedTask && <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={sprG} className="shrink-0 overflow-hidden bg-white border-l border-gray-200"><div style={{ width: 300 }} className="h-full">{renderDetail()}</div></motion.div>}</AnimatePresence>
            </div>
          )}

          {(view === 'today' || view === 'calendar') && (
            <aside className="flex flex-col w-52 shrink-0 border-l border-gray-200 overflow-y-auto bg-white" style={{ scrollbarWidth: 'none' }}>
              <div className="p-3 pb-2"><MiniCal cd={cd} events={filteredEvents} onSelect={(y, m, d) => { setCd({ year: y, month: m, day: d }); setSelDate(fmtD(y, m, d)); }} sq={sq} setSq={setSq} /></div>
              <div className="mx-3 border-t border-gray-100" />
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">Categories</h3>
                {categories.map(c => { const vis = visCats.includes(c.id); return <button key={c.id} onClick={() => setVisCats(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer transition ${vis ? 'text-gray-700' : 'text-gray-400'} hover:bg-gray-50`}><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.hex, opacity: vis ? 1 : 0.3 }} /><span className="flex-1 text-left font-medium">{c.name}</span>{vis ? <Eye size={9} className="text-gray-300" /> : <EyeOff size={9} className="text-gray-300" />}</button>; })}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Capture */}
      <AnimatePresence>{showCapture && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-start justify-center pt-32 z-50 backdrop-blur-sm" onClick={() => setShowCapture(false)}>
        <motion.div initial={{ y: -20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.95 }} transition={spr} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-3"><Brain size={15} className="text-indigo-500" /><h3 className="text-base font-bold text-gray-800">Quick Capture</h3><span className="text-xs text-gray-400 ml-auto">N</span></div>
          <input ref={captureRef} value={captureInput} onChange={e => setCaptureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCapture(); if (e.key === 'Escape') setShowCapture(false); }} placeholder="What's on your mind?..." className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl outline-none focus:border-indigo-400" />
          <div className="flex items-center justify-between mt-3"><p className="text-xs text-gray-400">Goes to Inbox</p><button onClick={handleCapture} className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 flex items-center gap-1"><Send size={12} />Capture</button></div>
        </motion.div>
      </motion.div>}</AnimatePresence>

      {/* Process */}
      <AnimatePresence>{procTaskId && (() => { const pt = tasks.find(t => t.id === procTaskId); if (!pt) return null; return (
        <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => { setProcTaskId(null); setProcStep(0); }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={spr} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3"><Brain size={15} className="text-indigo-500" /><h3 className="text-base font-bold text-gray-800">Process</h3><button onClick={() => { setProcTaskId(null); setProcStep(0); }} className="ml-auto text-gray-400"><X size={16} /></button></div>
            <div className="bg-gray-50 rounded-xl p-2.5 mb-3"><p className="text-sm font-semibold text-gray-700">{pt.title}</p></div>
            <AnimatePresence mode="wait">
              {procStep === 0 && <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2"><p className="text-sm text-gray-600 font-semibold mb-2">Is this actionable?</p>{[{ a: 'next', icon: Zap, cls: 'bg-emerald-100 text-emerald-600', t: 'Next Action', d: "I'll do this" }, { a: 'waiting', icon: User, cls: 'bg-violet-100 text-violet-600', t: 'Delegate', d: 'Someone else' }, { a: 'someday', icon: Lightbulb, cls: 'bg-sky-100 text-sky-600', t: 'Someday', d: 'Later' }, { a: 'delete', icon: Trash2, cls: 'bg-red-100 text-red-600', t: 'Delete', d: 'Remove' }].map(o => { const OI = o.icon; return <button key={o.a} onClick={() => handleProcess(procTaskId, o.a)} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-left w-full transition"><div className={`w-7 h-7 rounded-lg ${o.cls} flex items-center justify-center`}><OI size={13} /></div><div><p className="text-sm font-semibold text-gray-700">{o.t}</p><p className="text-xs text-gray-400">{o.d}</p></div></button>; })}</motion.div>}
              {procStep === 1 && <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-indigo-50 rounded-lg p-2 mb-3 flex items-center gap-1.5"><Sparkles size={10} className="text-indigo-500" /><span className="text-xs text-indigo-600">AI: @{suggestCtx(pt.title)}, {suggestEn(pt.title)} energy</span></div>
                <div className="space-y-2.5">
                  <div><span className="text-xs font-semibold text-gray-500 block mb-1">Context</span><div className="flex flex-wrap gap-1">{CONTEXTS.map(ctx => { const CI = ctx.icon; return <button key={ctx.id} onClick={() => setProcCtx(ctx.id)} className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${procCtx === ctx.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}><CI size={10} />{ctx.label}</button>; })}</div></div>
                  <div><span className="text-xs font-semibold text-gray-500 block mb-1">Energy</span><div className="flex gap-1">{ENERGY.map(l => { const LI = l.icon; return <button key={l.id} onClick={() => setProcEnergy(l.id)} className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${procEnergy === l.id ? `${l.bg} ${l.color}` : 'bg-gray-100 text-gray-500'}`}><LI size={10} />{l.label}</button>; })}</div></div>
                  <div><span className="text-xs font-semibold text-gray-500 block mb-1">Time</span><div className="flex flex-wrap gap-1">{TIME_EST.map(m => <button key={m} onClick={() => setProcTime(m)} className={`px-2 py-1 rounded-lg text-xs font-medium transition ${procTime === m ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{m}m</button>)}</div></div>
                  <div><span className="text-xs font-semibold text-gray-500 block mb-1">Project</span><div className="flex flex-wrap gap-1"><button onClick={() => setProcProject(null)} className={`px-2 py-1 rounded-lg text-xs font-medium transition ${procProject === null ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>None</button>{projects.map(p => <button key={p.id} onClick={() => setProcProject(p.id)} className="px-2 py-1 rounded-lg text-xs font-medium transition" style={procProject === p.id ? { background: p.color, color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>{p.title}</button>)}</div></div>
                </div>
                <div className="flex gap-2 mt-3"><button onClick={() => setProcStep(0)} className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl">Back</button><button onClick={() => handleProcess(procTaskId, 'confirm-next')} className="flex-1 px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1"><Check size={12} />Save</button></div>
              </motion.div>}
              {procStep === 3 && <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><p className="text-sm text-gray-600 font-semibold mb-2">Who?</p><input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleProcess(procTaskId, 'confirm-waiting'); }} placeholder="Person or team..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 mb-3" /><div className="flex gap-2"><button onClick={() => setProcStep(0)} className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl">Back</button><button onClick={() => handleProcess(procTaskId, 'confirm-waiting')} className="flex-1 px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1"><Check size={12} />Save</button></div></motion.div>}
            </AnimatePresence>
          </motion.div>
        </motion.div>);
      })()}</AnimatePresence>

      {/* Focus */}
      <AnimatePresence>{showFocus && (() => { const ft = tasks.find(t => t.id === focusTaskId); if (!ft) return null; return (
        <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center p-8">
          <button onClick={() => { setShowFocus(false); setPomRun(false); }} className="absolute top-6 right-6 text-gray-500 hover:text-white text-sm flex items-center gap-2"><Minimize2 size={14} />Exit</button>
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-extrabold text-white mb-8">{ft.title}</h1>
            <div className="mb-8"><div className="text-6xl font-mono font-bold text-white mb-4 tabular-nums">{fmtTimer(pomSec)}</div>
              <div className="flex items-center justify-center gap-3"><button onClick={() => setPomRun(!pomRun)} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${pomRun ? 'bg-gray-700' : 'bg-indigo-500'}`}>{pomRun ? <Pause size={20} /> : <Play size={20} />}</button><button onClick={() => { setPomRun(false); setPomSec(pomMode === 'work' ? 1500 : 300); }} className="w-10 h-10 rounded-2xl bg-gray-800 text-gray-400 flex items-center justify-center"><RotateCcw size={15} /></button></div>
              <div className="flex justify-center gap-2 mt-3"><button onClick={() => { setPomMode('work'); setPomRun(false); setPomSec(1500); }} className={`text-xs px-3 py-1 rounded-lg ${pomMode === 'work' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Focus 25m</button><button onClick={() => { setPomMode('break'); setPomRun(false); setPomSec(300); }} className={`text-xs px-3 py-1 rounded-lg ${pomMode === 'break' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Break 5m</button></div>
            </div>
            {ft.subtasks.length > 0 && <div className="bg-gray-900 rounded-2xl p-4 text-left border border-gray-800 max-w-sm mx-auto"><p className="text-xs text-gray-400 font-semibold uppercase mb-2">Subtasks</p>{ft.subtasks.map(st => <div key={st.id} className="flex items-center gap-2 py-1 cursor-pointer" onClick={() => updateTask(ft.id, { subtasks: toggleStInTree(ft.subtasks, st.id) })}>{st.done ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><Check size={9} className="text-white" /></div> : <div className="w-4 h-4 rounded-full border-2 border-gray-600" />}<span className={`text-sm ${st.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{st.title}</span>{st.subtasks?.length > 0 && <span className="text-xs text-gray-600 ml-auto">{countSt(st.subtasks).d}/{countSt(st.subtasks).t}</span>}</div>)}</div>}
            <button onClick={() => { updateTask(ft.id, { status: 'done' }); setShowFocus(false); setPomRun(false); }} className="mt-6 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 flex items-center gap-2 mx-auto"><CheckCircle size={15} />Complete</button>
          </div>
        </motion.div>);
      })()}</AnimatePresence>

      <EvModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveEv} onDelete={handleDelEv} event={editEv} selDate={selDate} ds={ds} de={de} categories={categories} />

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 items-center pointer-events-none">
        <AnimatePresence>{toasts.map(t => <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.9 }} transition={spr} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white shadow-xl border border-gray-200">{t.msg}</motion.div>)}</AnimatePresence>
      </div>
    </div>
  );
}