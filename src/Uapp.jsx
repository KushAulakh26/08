import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  ChevronLeft, ChevronRight, X, Trash2, Search, ChevronDown, Eye,
  Repeat, Plus, Clock, Calendar, ArrowRight, Check,
  CheckCircle, Star, Play, Pause, RotateCcw, Sun, Zap, Inbox, Folder,
  Home, Lightbulb, RefreshCw, Target, Coffee, Brain, Send, User,
  Minimize2, Flame, Monitor, Phone, Briefcase, Archive, Link2,
  Menu, PanelLeftClose, TrendingUp,
  AlertCircle, Hash, Tag,
  Maximize2, GripVertical, Bell, SkipForward, PlusCircle
} from 'lucide-react';

const DB_NAME='FlowMindDB_v5';const DB_VER=7;
const openDB=()=>new Promise((res,rej)=>{try{const r=indexedDB.open(DB_NAME,DB_VER);r.onupgradeneeded=e=>{const db=e.target.result;['tasks','events','projects','tags','categories'].forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});
const dbGetAll=store=>new Promise(async(res,rej)=>{try{const db=await openDB();const tx=db.transaction(store,'readonly');const rq=tx.objectStore(store).getAll();rq.onsuccess=()=>{res(rq.result);db.close();};rq.onerror=()=>{rej(rq.error);db.close();};}catch(e){res([]);}});
const dbPutAll=(store,items)=>new Promise(async(res,rej)=>{try{const db=await openDB();const tx=db.transaction(store,'readwrite');const s=tx.objectStore(store);s.clear();items.forEach(i=>s.put(i));tx.oncomplete=()=>{res();db.close();};tx.onerror=()=>{rej(tx.error);db.close();};}catch(e){res();}});

const HH=60,SN=15;
const HOURS=Array.from({length:24},(_,i)=>i);
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_MON=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DEFAULT_CATS=[{id:'work',name:'Work',hex:'#7d8a9a'},{id:'personal',name:'Personal',hex:'#6b9a7e'},{id:'meeting',name:'Meeting',hex:'#8f849c'},{id:'deadline',name:'Deadline',hex:'#a85c58'},{id:'event',name:'Event',hex:'#b09245'}];
const CONTEXTS=[{id:'computer',label:'@Computer',icon:Monitor,color:'#7d8a9a'},{id:'calls',label:'@Calls',icon:Phone,color:'#6b9a7e'},{id:'home',label:'@Home',icon:Home,color:'#b09245'},{id:'errands',label:'@Errands',icon:Archive,color:'#8f849c'},{id:'office',label:'@Office',icon:Briefcase,color:'#a85c58'}];
const ENERGY=[{id:'low',label:'Low',icon:Coffee,color:'text-slate-400',bg:'bg-slate-900',fill:'#64748b'},{id:'medium',label:'Medium',icon:Zap,color:'text-stone-400',bg:'bg-stone-800',fill:'#a89080'},{id:'high',label:'High',icon:Flame,color:'text-red-300',bg:'bg-red-950',fill:'#c07068'}];
const TIME_EST=[5,15,30,45,60,90,120];
const REC_TYPES=[{v:'none',l:'None'},{v:'daily',l:'Daily'},{v:'weekly',l:'Weekly'},{v:'monthly',l:'Monthly'}];
const PROJ_COLORS=['#7d8a9a','#b09245','#6b9a7e','#a85c58','#8f849c','#6a9fad','#a87080','#8aaa50','#b08050','#6a9f96'];
const NAV_VIEWS=[{id:'today',label:'Today',icon:Sun},{id:'inbox',label:'Inbox',icon:Inbox},{id:'next',label:'Next Actions',icon:Zap},{id:'projects',label:'Projects',icon:Folder},{id:'waiting',label:'Waiting For',icon:Clock},{id:'someday',label:'Someday/Maybe',icon:Lightbulb},{id:'calendar',label:'Calendar',icon:Calendar},{id:'review',label:'Weekly Review',icon:RefreshCw}];
const REVIEW_STEPS=[{title:'Clear Inbox',desc:'Process every item in your inbox to zero.',icon:Inbox,key:'inbox'},{title:'Review Projects',desc:'Check each project for next actions.',icon:Folder,key:'projects'},{title:'Review Waiting',desc:'Follow up on delegated items.',icon:Clock,key:'waiting'},{title:'Review Someday',desc:'Promote or remove stale ideas.',icon:Lightbulb,key:'someday'},{title:'Plan Next Week',desc:'Set priorities and time-block.',icon:Calendar,key:'plan'}];
const HOUR_OPTS=Array.from({length:24},(_,i)=>({value:i,label:String(i).padStart(2,'0')}));
const MINUTE_OPTS=[0,15,30,45].map(m=>({value:m,label:String(m).padStart(2,'0')}));
const spr={type:'spring',damping:22,stiffness:350};
const sprG={type:'spring',damping:25,stiffness:300};

const snap=m=>Math.round(m/SN)*SN;
const mToY=m=>(m/60)*HH;
const yToM=y=>snap(Math.max(0,Math.min((y/HH)*60,1440)));
const yToMR=y=>Math.max(0,Math.min((y/HH)*60,1440));
const fmtT=m=>{const h=Math.floor(m/60),mi=Math.round(m%60);return`${h%12||12}:${String(mi).padStart(2,'0')} ${h>=12?'PM':'AM'}`;};
const fmtS=m=>{const h=Math.floor(m/60),mi=Math.round(m%60);return`${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`;};
const fmtD=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const fmtDO=d=>fmtD(d.getFullYear(),d.getMonth(),d.getDate());
const gDIM=(y,m)=>new Date(y,m+1,0).getDate();
const gMDOW=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1;};
const hRgba=(hex,a)=>{if(!hex||hex.length<7)return`rgba(196,182,156,${a})`;const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;};
const fmtTimer=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const suggestCtx=t=>{const l=t.toLowerCase();if(l.includes('call'))return'calls';if(l.includes('buy'))return'errands';return'computer';};
const suggestEn=t=>{const l=t.toLowerCase();if(l.includes('write')||l.includes('create'))return'high';if(l.includes('review'))return'medium';return'low';};
const toggleStInTree=(subs,id)=>subs.map(s=>s.id===id?{...s,done:!s.done}:{...s,subtasks:s.subtasks?toggleStInTree(s.subtasks,id):[]});
const delStFromTree=(subs,id)=>subs.filter(s=>s.id!==id).map(s=>({...s,subtasks:s.subtasks?delStFromTree(s.subtasks,id):[]}));
const addStChild=(subs,pid,ns)=>subs.map(s=>s.id===pid?{...s,subtasks:[...(s.subtasks||[]),ns]}:{...s,subtasks:s.subtasks?addStChild(s.subtasks,pid,ns):[]});
const countSt=subs=>{let t=0,d=0;for(const s of(subs||[])){t++;if(s.done)d++;const c=countSt(s.subtasks);t+=c.t;d+=c.d;}return{t,d};};

const expandRec=(base,rs,re)=>{const r=[];for(const ev of base){if(!ev.recurrence||ev.recurrence==='none'){r.push({...ev,_bid:ev.id,_rec:false});continue;}const map={daily:1,weekly:7,monthly:0};const recEnd=ev.recurrenceEnd?new Date(ev.recurrenceEnd+'T23:59:59'):null;const endD=recEnd&&recEnd<re?recEnd:re;let c=new Date(ev.date+'T00:00:00'),cnt=0;while(c<=endD&&cnt<500){cnt++;if(c>=rs)r.push({...ev,date:fmtDO(c),_bid:ev.id,_rec:true});const n=new Date(c);if(ev.recurrence==='monthly')n.setMonth(n.getMonth()+1);else n.setDate(n.getDate()+(map[ev.recurrence]||1));if(n<=c)break;c=n;}}return r;};

const layoutOL=evts=>{if(!evts.length)return[];const sorted=evts.map(e=>({...e})).sort((a,b)=>a.startMin-b.startMin||(b.endMin-b.startMin)-(a.endMin-a.startMin));const cols=[];sorted.forEach(ev=>{let c=0;while(cols[c]&&cols[c].some(e=>e.startMin<ev.endMin&&e.endMin>ev.startMin))c++;if(!cols[c])cols[c]=[];cols[c].push(ev);ev._col=c;});return sorted.map(ev=>{const ov=sorted.filter(e=>e.startMin<ev.endMin&&e.endMin>ev.startMin);return{...ev,_totalCols:Math.max(...ov.map(e=>e._col))+1};});};

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
:root{--bg:#0c0c0c;--surface:#141414;--surface2:#1a1a1a;--surface3:#232323;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.10);--accent:#c4b69c;--accent-dim:rgba(196,182,156,0.10);--accent-glow:rgba(196,182,156,0.18);--text:#e8e5e1;--text2:#8a8580;--text3:#504b46;--emerald:#6fac8e;--amber:#c9a043;--rose:#bf5a5a;--violet:#9a9490;--radius:14px;--radius-sm:8px;--radius-lg:20px;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}html,body,#root{height:100%;overflow:hidden;}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;}
*{scrollbar-width:none;-ms-overflow-style:none;}*::-webkit-scrollbar{display:none;}
input[type="date"]{color-scheme:dark;}
.fm-input{width:100%;padding:9px 13px;background:var(--surface3);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .15s;}
.fm-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);}.fm-input::placeholder{color:var(--text3);}
.fm-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:var(--radius-sm);font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;border:none;outline:none;transition:all .15s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;-webkit-tap-highlight-color:transparent;}
.fm-btn:active{transform:scale(.96);}
.fm-btn-primary{background:var(--accent);color:#1a1a1a;box-shadow:0 2px 12px var(--accent-glow);}
.fm-btn-primary:hover{background:#d4cabb;box-shadow:0 4px 20px var(--accent-glow);}
.fm-btn-ghost{background:var(--surface3);color:var(--text2);border:1.5px solid var(--border);}
.fm-btn-ghost:hover{border-color:var(--border2);color:var(--text);}
.fm-btn-danger{background:rgba(191,90,90,.15);color:var(--rose);border:1.5px solid rgba(191,90,90,.2);}
.fm-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);transition:border-color .2s,box-shadow .2s;}
.fm-card:hover{border-color:var(--border2);}
.nav-item{width:100%;display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--radius-sm);margin-bottom:2px;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;text-align:left;background:transparent;transition:all .15s;color:var(--text2);-webkit-tap-highlight-color:transparent;}
.nav-item:hover{background:var(--surface3);color:var(--text);}
.nav-item.active{background:var(--accent-dim);color:var(--accent);border:1.5px solid var(--border2);}
.task-row{position:relative;border-radius:var(--radius);border:1.5px solid var(--border);cursor:pointer;overflow:hidden;transition:all .15s;background:var(--surface);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.task-row:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.3);}
.task-row.selected{border-color:var(--accent);background:rgba(196,182,156,.06);}
.task-row.done{opacity:.45;}
.task-row.overdue-glow{border-color:rgba(191,90,90,0.35);box-shadow:0 0 12px rgba(191,90,90,0.12);}
.task-row.priority-glow{border-color:rgba(201,160,67,0.3);}
.check-btn{width:16px;height:16px;border-radius:50%;border:2px solid var(--text3);display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;cursor:pointer;background:transparent;-webkit-tap-highlight-color:transparent;}
.check-btn.done{background:var(--emerald);border-color:var(--emerald);}
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:5px;font-size:10px;font-weight:700;white-space:nowrap;}
.pill-tab{padding:5px 12px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:transparent;color:var(--text2);transition:all .15s;-webkit-tap-highlight-color:transparent;}
.pill-tab.active{background:var(--accent);color:#1a1a1a;border-color:var(--accent);}
.modal-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;}
.modal-box{background:var(--surface2);border:1.5px solid var(--border2);border-radius:var(--radius-lg);box-shadow:0 30px 80px rgba(0,0,0,.7);width:100%;max-width:480px;margin:0 16px;overflow:hidden;}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;text-align:center;}
.empty-icon{width:64px;height:64px;border-radius:20px;background:var(--surface3);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.empty-title{font-size:15px;font-weight:700;color:var(--text2);margin-bottom:6px;}
.empty-sub{font-size:12px;color:var(--text3);line-height:1.5;max-width:200px;}
.progress-bar{height:4px;border-radius:4px;background:var(--surface3);overflow:hidden;}
.progress-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--accent),#d4cabb);transition:width .5s;}
.section-header{display:flex;align-items:center;gap:8px;margin-bottom:16px;}
.section-header h2{font-size:18px;font-weight:800;color:var(--text);}
.section-count{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:var(--surface3);color:var(--text2);border:1px solid var(--border);}
.mono{font-family:'DM Mono',monospace;}
.glow-dot{width:8px;height:8px;border-radius:50%;background:var(--emerald);box-shadow:0 0 0 3px rgba(111,172,142,.2);animation:pulse-glow 2s infinite;}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 3px rgba(111,172,142,.2);}50%{box-shadow:0 0 0 6px rgba(111,172,142,.1);}}
.today-line-dot{position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:var(--rose);box-shadow:0 0 8px rgba(191,90,90,.5);}
.today-line-dot::after{content:'';position:absolute;inset:0;border-radius:50%;background:var(--rose);animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;opacity:0;}
@keyframes ping{75%,100%{transform:scale(2.5);opacity:0;}}
.cal-event{transition: filter .15s, transform .15s;-webkit-tap-highlight-color: transparent; -webkit-user-select: none;user-select: none;-webkit-touch-callout: none;touch-action: none;
}.cal-event:hover{filter:brightness(1.15);}
.tag-pill{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:999px;font-size:9px;font-weight:700;}
.summary-card{border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;border:1.5px solid var(--border);background:var(--surface);}
.quick-act{padding:4px;border-radius:6px;border:none;background:transparent;cursor:pointer;color:var(--text3);transition:all .15s;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}
.quick-act:hover,.quick-act:active{background:var(--surface3);color:var(--text);}
.reminder-card{background:var(--surface2);border:1.5px solid var(--border2);border-radius:12px;padding:10px 12px;width:280px;box-shadow:0 12px 32px rgba(0,0,0,0.5);}
.touch-ghost{position:fixed;z-index:100;pointer-events:none;padding:8px 16px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--violet));color:#1a1a1a;font-size:12px;font-weight:700;box-shadow:0 16px 48px rgba(0,0,0,0.6),0 0 0 2px rgba(196,182,156,0.4);max-width:200px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;transform:translate(-50%,-130%);opacity:0.95;}
.search-bar{position:relative;}.search-bar input{padding-left:30px;}
.search-bar svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);}
.themed-select-trigger{display:inline-flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 10px;background:var(--surface3);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;outline:none;transition:all .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent;}
.themed-select-trigger:hover{border-color:var(--border2);background:var(--surface2);}
.themed-select-trigger:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);}
.themed-select-menu{background:var(--surface2);border:1.5px solid var(--border2);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.04);overflow-y:auto;overflow-x:hidden;padding:4px;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;}
.themed-select-option{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:500;color:var(--text2);cursor:pointer;transition:background .1s,color .1s;white-space:nowrap;gap:8px;}
.themed-select-option:hover{background:var(--surface3);color:var(--text);}
.themed-select-option.active{background:var(--accent-dim);color:var(--accent);font-weight:700;}
select{appearance:none;-webkit-appearance:none;background:var(--surface3);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;padding:6px 26px 6px 10px;outline:none;cursor:pointer;transition:all .15s;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238a8580' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;}
select:hover{border-color:var(--border2);}
select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);}
select option{background:var(--surface2);color:var(--text);padding:6px 8px;}
`;

/* ---------- ThemedSelect (FIXED: scroll inside dropdown) ---------- */
function ThemedSelect({value,onChange,options,width,placeholder}){
  const[open,setOpen]=useState(false);
  const wrapRef=useRef(null);
  const menuRef=useRef(null);
  const[menuStyle,setMenuStyle]=useState({});

  useEffect(()=>{
    if(!open)return;

    /* Close on click/tap outside */
    const onOut=e=>{
      if(menuRef.current && (menuRef.current===e.target || menuRef.current.contains(e.target))) return;
      if(wrapRef.current && wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };

    /* Close on background scroll — but NOT if scrolling inside the menu */
    const onScroll=e=>{
      if(menuRef.current && (menuRef.current===e.target || menuRef.current.contains(e.target))) return;
      setOpen(false);
    };

    document.addEventListener('mousedown',onOut);
    document.addEventListener('touchstart',onOut);
    window.addEventListener('scroll',onScroll,true);
    return()=>{
      document.removeEventListener('mousedown',onOut);
      document.removeEventListener('touchstart',onOut);
      window.removeEventListener('scroll',onScroll,true);
    };
  },[open]);

  const handleToggle=e=>{
    e.preventDefault();e.stopPropagation();
    if(!open&&wrapRef.current){
      const rect=wrapRef.current.getBoundingClientRect();
      const menuMaxH=Math.min(options.length*30+8,196);
      const spaceBelow=window.innerHeight-rect.bottom-8;
      const openUp=spaceBelow<menuMaxH;
      setMenuStyle({position:'fixed',left:rect.left,width:Math.max(rect.width,60),maxHeight:196,zIndex:200,...(openUp?{bottom:window.innerHeight-rect.top+4}:{top:rect.bottom+4})});
    }
    setOpen(!open);
  };

  const sel=options.find(o=>o.value===value);

  /* Stop touch events from reaching global gesture handlers */
  const stopTouch=useCallback(e=>{e.stopPropagation();},[]);

  return(
    <div ref={wrapRef} style={{position:'relative',display:'inline-flex'}}>
      <button type="button" onClick={handleToggle} className="themed-select-trigger" style={{minWidth:width||'auto'}}>
        <span style={{color:sel?'var(--text)':'var(--text3)'}}>{sel?sel.label:(placeholder||'Select')}</span>
        <ChevronDown size={9} style={{color:'var(--text3)',transition:'transform 0.2s',transform:open?'rotate(180deg)':'rotate(0deg)',flexShrink:0}}/>
      </button>
      {open&&<div
        ref={menuRef}
        className="themed-select-menu"
        style={menuStyle}
        onClick={e=>e.stopPropagation()}
        onTouchStart={stopTouch}
        onTouchMove={stopTouch}
        onTouchEnd={stopTouch}
        onMouseDown={e=>e.stopPropagation()}
      >
        {options.map(o=>(
          <div key={o.value} className={`themed-select-option ${o.value===value?'active':''}`} onClick={e=>{e.stopPropagation();onChange(o.value);setOpen(false);}}>
            <span>{o.label}</span>
            {o.value===value&&<Check size={9} style={{color:'var(--accent)',flexShrink:0}}/>}
          </div>
        ))}
      </div>}
    </div>
  );
}

/* ---------- SubtaskItem ---------- */
function SubtaskItem({st,onToggle,onDel,onAddChild,depth,maxD}){
  const[exp,setExp]=useState(true);const[adding,setAdding]=useState(false);const[val,setVal]=useState('');
  const hasCh=st.subtasks&&st.subtasks.length>0;const canNest=depth<maxD;
  return(<div>
    <div className="group flex items-center gap-1 py-1 px-1 rounded-lg hover:bg-white/5 transition-colors" style={{paddingLeft:depth*14+4}}>
      {hasCh?<button onClick={e=>{e.stopPropagation();setExp(!exp);}} className="w-4 h-4 flex items-center justify-center shrink-0"><ChevronRight size={9} style={{color:'var(--text3)',transition:'transform 0.2s',transform:exp?'rotate(90deg)':'rotate(0deg)'}}/></button>:<span className="w-4 shrink-0"/>}
      <button onClick={e=>{e.stopPropagation();onToggle(st.id);}} className="shrink-0"><div className={`check-btn ${st.done?'done':''}`} style={{width:13,height:13,borderWidth:2}}>{st.done&&<Check size={7} className="text-white" strokeWidth={3}/>}</div></button>
      <span className="text-xs flex-1 truncate" style={{color:st.done?'var(--text3)':'var(--text2)',textDecoration:st.done?'line-through':'none'}}>{st.title}</span>
      {canNest&&<button onClick={e=>{e.stopPropagation();setAdding(!adding);}} className="p-0.5 rounded" style={{color:'var(--text3)'}}><Plus size={9}/></button>}
      <button onClick={e=>{e.stopPropagation();onDel(st.id);}} className="p-0.5 rounded" style={{color:'var(--text3)'}}><X size={9}/></button>
    </div>
    <AnimatePresence>{adding&&(<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
      <div className="flex items-center gap-1 py-0.5" style={{paddingLeft:(depth+1)*14+18}}>
        <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&val.trim()){onAddChild(st.id,val.trim());setVal('');setAdding(false);}if(e.key==='Escape')setAdding(false);}} placeholder="Sub-item..." className="fm-input flex-1" style={{fontSize:11,padding:'4px 8px'}}/>
        <button onClick={()=>{if(val.trim()){onAddChild(st.id,val.trim());setVal('');setAdding(false);}}} className="fm-btn fm-btn-ghost" style={{padding:'4px 8px'}}><Plus size={8}/></button>
      </div>
    </motion.div>)}</AnimatePresence>
    {hasCh&&exp&&st.subtasks.map(c=><SubtaskItem key={c.id} st={c} onToggle={onToggle} onDel={onDel} onAddChild={onAddChild} depth={depth+1} maxD={maxD}/>)}
  </div>);
}

/* ---------- MiniCal ---------- */
function MiniCal({cd,onSelect,events,sq,setSq}){
  const[vm,setVm]=useState(cd.month);const[vy,setVy]=useState(cd.year);
  useEffect(()=>{setVm(cd.month);setVy(cd.year);},[cd.month,cd.year]);
  const dim=gDIM(vy,vm),fd=gMDOW(vy,vm),pDim=vm===0?gDIM(vy-1,11):gDIM(vy,vm-1);
  const cells=[];for(let i=fd-1;i>=0;i--)cells.push({day:pDim-i,ov:true});for(let d=1;d<=dim;d++)cells.push({day:d,ov:false});const tot=Math.ceil(cells.length/7)*7;for(let d=1;cells.length<tot;d++)cells.push({day:d,ov:true});
  const rows=[];for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));
  const t=new Date();const isT=c=>!c.ov&&t.getFullYear()===vy&&t.getMonth()===vm&&t.getDate()===c.day;const isS=c=>!c.ov&&cd.year===vy&&cd.month===vm&&cd.day===c.day;const hasE=c=>!c.ov&&events.some(e=>e.date===fmtD(vy,vm,c.day));
  return(<div className="select-none">
    <div className="flex items-center justify-between mb-3"><div className="flex items-baseline gap-1.5"><span style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>{MONTHS[vm]}</span><span style={{fontSize:11,color:'var(--text3)'}}>{vy}</span></div><div className="flex gap-0.5">{[[-1,'‹'],[1,'›']].map(([d,lbl])=><button key={d} onClick={()=>{if(d===-1){if(vm===0){setVm(11);setVy(vy-1);}else setVm(vm-1);}else{if(vm===11){setVm(0);setVy(vy+1);}else setVm(vm+1);}}} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{fontSize:14,color:'var(--text3)'}}>{lbl}</button>)}</div></div>
    {setSq&&<div className="relative mb-2"><input value={sq||''} onChange={e=>setSq(e.target.value)} placeholder="Search events..." className="fm-input" style={{fontSize:11,padding:'5px 28px 5px 10px'}}/>{sq?<button onClick={()=>setSq('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{color:'var(--text3)'}}><X size={10}/></button>:<Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2" style={{color:'var(--text3)'}}/>}</div>}
    <div className="grid grid-cols-7 mb-1">{['M','T','W','T','F','S','S'].map((d,i)=><div key={i} className="text-center" style={{fontSize:10,fontWeight:600,color:'var(--text3)',padding:'2px 0'}}>{d}</div>)}</div>
    {rows.map((row,ri)=><div key={ri} className="grid grid-cols-7">{row.map((cell,ci)=>{const sel=isS(cell),tod=isT(cell);return<button key={ci} onClick={()=>!cell.ov&&onSelect(vy,vm,cell.day)} className="relative flex items-center justify-center" style={{padding:'2px 0'}}><span style={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',fontSize:10.5,fontWeight:tod?700:sel?600:400,background:tod?'var(--accent)':sel?'rgba(196,182,156,0.15)':'transparent',color:tod?'#1a1a1a':sel?'var(--accent)':cell.ov?'var(--text3)':'var(--text2)'}}>{cell.day}</span>{!cell.ov&&hasE(cell)&&!sel&&!tod&&<span style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:'50%',background:'var(--accent)'}}/>}</button>;})}</div>)}
  </div>);
}


/* ---------- EvModal ---------- */
function EvModal({isOpen,onClose,onSave,onDelete,event,selDate,ds,de,categories,onAddCat}){
  const[title,setTitle]=useState('');const[desc,setDesc]=useState('');const[cat,setCat]=useState('work');
  const[rec,setRec]=useState('none');const[recEnd,setRecEnd]=useState('');
  const[showAddCat,setShowAddCat]=useState(false);const[ncName,setNcName]=useState('');const[ncHex,setNcHex]=useState('#6a9fad');
  const[alsoCreateTask,setAlsoCreateTask]=useState(false);
  const[startMin,setStartMin]=useState(540);
  const[endMin,setEndMin]=useState(600);
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMinute, setEndMinute] = useState(0);

  useEffect(()=>{
    if(isOpen){
      setTitle(event?.title||'');setDesc(event?.description||'');setCat(event?.category||'work');setRec(event?.recurrence||'none');setRecEnd(event?.recurrenceEnd||'');setShowAddCat(false);setAlsoCreateTask(!event);
      const s = event?.startMin ?? ds ?? 540;const e = event?.endMin ?? de ?? 600;
      setStartMin(s);setEndMin(e);setStartHour(Math.floor(s/60));setStartMinute(s%60);setEndHour(Math.floor(e/60));setEndMinute(e%60);
    }
  },[event,isOpen,ds,de]);

  useEffect(()=>{const newStart = startHour * 60 + startMinute;if (newStart !== startMin) {setStartMin(newStart);if (endMin <= newStart) {const newEnd = Math.min(newStart + 30, 1440);setEndMin(newEnd);setEndHour(Math.floor(newEnd/60));setEndMinute(newEnd%60);}}},[startHour,startMinute, startMin, endMin]);
  useEffect(()=>{const newEnd = endHour * 60 + endMinute;if (newEnd !== endMin) {if (newEnd > startMin) {setEndMin(newEnd);} else {const corrected = Math.min(startMin + 30, 1440);setEndMin(corrected);setEndHour(Math.floor(corrected/60));setEndMinute(corrected%60);}}},[endHour,endMinute, startMin, endMin]);

  if(!isOpen)return null;
  const cc=categories.find(x=>x.id===cat);
  const date = event?.date || selDate || fmtDO(new Date());

  return(<AnimatePresence>{isOpen&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-overlay" onClick={onClose}>
    <motion.div initial={{opacity:0,scale:0.92,y:24}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92}} transition={spr} className="modal-box" onClick={e=>e.stopPropagation()}>
      <div style={{height:3,background:`linear-gradient(90deg,${cc?.hex||'var(--accent)'},${hRgba(cc?.hex||'#c4b69c',0.4)})`}}/>
      <div className="p-5" style={{maxHeight:'85vh',overflowY:'auto'}}>
        <div className="flex justify-between items-center mb-4"><h2 style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>{event?'Edit Event':'New Event'}</h2><button onClick={onClose} className="fm-btn fm-btn-ghost" style={{padding:'5px'}}><X size={15}/></button></div>
        <div style={{background:'rgba(196,182,156,0.06)',border:'1.5px solid rgba(196,182,156,0.12)',borderRadius:10,padding:'10px 12px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
          <Calendar size={13} style={{color:'var(--accent)',flexShrink:0}}/>
          <div><p style={{fontSize:11,fontWeight:700,color:'var(--accent)'}}>{new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p></div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:8}}>Time</label>
          <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:3}}>
              <ThemedSelect value={startHour} onChange={v=>setStartHour(v)} options={HOUR_OPTS} width={52}/>
              <span style={{color:'var(--text3)',fontWeight:700,fontSize:13}}>:</span>
              <ThemedSelect value={startMinute} onChange={v=>setStartMinute(v)} options={MINUTE_OPTS} width={52}/>
            </div>
            <span style={{color:'var(--text3)',fontSize:12,margin:'0 4px'}}>–</span>
            <div style={{display:'flex',alignItems:'center',gap:3}}>
              <ThemedSelect value={endHour} onChange={v=>setEndHour(v)} options={HOUR_OPTS} width={52}/>
              <span style={{color:'var(--text3)',fontWeight:700,fontSize:13}}>:</span>
              <ThemedSelect value={endMinute} onChange={v=>setEndMinute(v)} options={MINUTE_OPTS} width={52}/>
            </div>
          </div>
          <p style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Duration: {Math.round((endMin - startMin) / 60 * 10) / 10}h</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="fm-input" autoFocus placeholder="Event title..."/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Description</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className="fm-input" style={{resize:'none'}} placeholder="Notes..."/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>Category</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              {categories.map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{padding:'4px 12px',borderRadius:999,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',background:cat===c.id?c.hex:hRgba(c.hex,0.15),color:cat===c.id?'#fff':c.hex}}>{c.name}</button>)}
              <button onClick={()=>setShowAddCat(!showAddCat)} style={{width:24,height:24,borderRadius:'50%',border:'1.5px dashed var(--border2)',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text3)'}}><Plus size={10}/></button>
            </div>
            <AnimatePresence>{showAddCat&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden'}}><div style={{marginTop:8,padding:10,background:'var(--surface3)',borderRadius:8,border:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8}}><input value={ncName} onChange={e=>setNcName(e.target.value)} placeholder="Category name..." className="fm-input" style={{fontSize:11,padding:'5px 8px'}}/><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{PROJ_COLORS.map(c=><button key={c} onClick={()=>setNcHex(c)} style={{width:18,height:18,borderRadius:'50%',background:c,border:'none',cursor:'pointer',boxShadow:ncHex===c?`0 0 0 2px var(--bg),0 0 0 3.5px ${c}`:'none'}}/>)}</div><button onClick={()=>{if(ncName.trim()&&onAddCat){onAddCat(ncName.trim(),ncHex);setNcName('');setShowAddCat(false);}}} className="fm-btn fm-btn-primary" style={{fontSize:11,padding:'5px 10px',alignSelf:'flex-start'}}><Plus size={10}/>Add</button></div></motion.div>}</AnimatePresence>
          </div>
          <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>Repeat</label><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{REC_TYPES.map(o=><button key={o.v} onClick={()=>setRec(o.v)} className={`pill-tab ${rec===o.v?'active':''}`}>{o.l}</button>)}</div></div>
          {rec!=='none'&&<div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Recurrence End Date</label><input type="date" value={recEnd} onChange={e=>setRecEnd(e.target.value)} className="fm-input" style={{fontSize:12,padding:'7px 10px'}}/><p style={{fontSize:10,color:'var(--text3)',marginTop:3}}>Leave blank for no end date</p></div>}
          {!event&&<div>
            <button onClick={()=>setAlsoCreateTask(!alsoCreateTask)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:10,border:'1.5px solid',cursor:'pointer',width:'100%',textAlign:'left',transition:'all 0.15s',background:alsoCreateTask?'rgba(111,172,142,0.06)':'transparent',borderColor:alsoCreateTask?'rgba(111,172,142,0.2)':'var(--border)'}}>
              <div style={{width:18,height:18,borderRadius:5,border:'2px solid',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',background:alsoCreateTask?'var(--emerald)':'transparent',borderColor:alsoCreateTask?'var(--emerald)':'var(--text3)'}}>{alsoCreateTask&&<Check size={10} style={{color:'#fff'}} strokeWidth={3}/>}</div>
              <div><p style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>Also create a task</p><p style={{fontSize:10,color:'var(--text3)',marginTop:1}}>Task linked to this calendar event</p></div>
            </button>
          </div>}
        </div>
        <div style={{display:'flex',gap:8,marginTop:20,alignItems:'center'}}>
          {event&&<button onClick={()=>{onDelete(event.id);onClose();}} className="fm-btn fm-btn-danger"><Trash2 size={12}/>Delete</button>}
          <div style={{flex:1}}/><button onClick={onClose} className="fm-btn fm-btn-ghost">Cancel</button>
          <button onClick={()=>{if(!title.trim())return;onSave({id:event?.id||'e'+Date.now(),title,description:desc,date,startMin,endMin,category:cat,recurrence:rec,recurrenceEnd:recEnd||'',taskId:event?.taskId||null,_createTask:alsoCreateTask&&!event});onClose();}} className="fm-btn fm-btn-primary">{event?'Update':alsoCreateTask?'Create Both':'Create Event'}</button>
        </div>
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>);
}

/* ---------- TaskRow ---------- */
const TaskRow=memo(function TaskRow({task,showProject,showQuickActions,selected,projects,tags,scheduledMap,todayStr,onMark,onSelect,onMoveToTomorrow,onSnooze,onTouchStart}){
  const isDone=task.status==='done';const stC=countSt(task.subtasks);const schEv=scheduledMap[task.id];
  const taskTags=(task.tags||[]).map(tid=>tags.find(t=>t.id===tid)).filter(Boolean);
  const isOverdue=task.dueDate&&task.dueDate<todayStr&&!isDone;
  const accent=isOverdue?'var(--rose)':task.priority?'var(--amber)':task.energy==='high'?'#c07068':task.energy==='medium'?'#a89080':'var(--accent)';
  return(
    <motion.div layout initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-12}} transition={spr}
      className={`task-row ${selected?'selected':''} ${isDone?'done':''} ${isOverdue?'overdue-glow':task.priority&&!isDone?'priority-glow':''}`}
      draggable onDragStart={e=>{e.dataTransfer.setData('taskId',task.id);e.dataTransfer.effectAllowed='copy';}}
      onTouchStart={onTouchStart?e=>onTouchStart(e,task.id,task.title,task.timeEst):undefined}
      onClick={()=>onSelect(task.id)}>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,borderRadius:'4px 0 0 4px',background:accent,opacity:isDone?0.3:1}}/>
      <div style={{padding:'9px 10px 9px 12px'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1,flexShrink:0}}>
            <GripVertical size={10} style={{color:'var(--text3)',cursor:'grab',opacity:0.4}}/>
            <button onClick={e=>{e.stopPropagation();onMark(task.id);}} style={{border:'none',background:'transparent',padding:0,cursor:'pointer'}}>
              <div className={`check-btn ${isDone?'done':''}`}>{isDone&&<Check size={8} style={{color:'#fff'}} strokeWidth={3}/>}</div>
            </button>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:13,fontWeight:600,lineHeight:1.3,color:isDone?'var(--text3)':'var(--text)',textDecoration:isDone?'line-through':'none'}}>{task.title}</p>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:5,flexWrap:'wrap'}}>
              {isOverdue&&<span className="badge" style={{background:'rgba(191,90,90,0.12)',color:'var(--rose)',fontSize:9}}><AlertCircle size={8}/>Overdue</span>}
              {showProject&&task.project&&(()=>{const p=projects.find(x=>x.id===task.project);return p?<span className="badge" style={{background:hRgba(p.color,0.15),color:p.color,fontSize:9}}>{p.title}</span>:null;})()}
              {task.energy&&(()=>{const e=ENERGY.find(x=>x.id===task.energy);if(!e)return null;const I=e.icon;return<span className={`badge ${e.bg} ${e.color}`} style={{fontSize:9}}><I size={8}/>{e.label}</span>;})()}
              {task.timeEst&&<span style={{fontSize:10,color:'var(--text3)',display:'flex',alignItems:'center',gap:2}}><Clock size={8}/>{task.timeEst}m</span>}
              {stC.t>0&&<span style={{fontSize:10,background:'var(--surface3)',color:'var(--text2)',padding:'1px 5px',borderRadius:5,border:'1px solid var(--border)'}}>{stC.d}/{stC.t}</span>}
              {schEv&&<span className="badge" style={{background:'rgba(196,182,156,0.12)',color:'var(--accent)',fontSize:9}}><Calendar size={8}/>{fmtS(schEv.startMin)}</span>}
              {taskTags.slice(0,2).map(tg=><span key={tg.id} className="tag-pill" style={{background:hRgba(tg.hex,0.15),color:tg.hex}}><Hash size={7}/>{tg.name}</span>)}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:2,flexShrink:0,marginTop:1}}>
            {showQuickActions&&!isDone&&<>
              <button className="quick-act" onClick={e=>{e.stopPropagation();onMoveToTomorrow(task.id);}} title="Tomorrow"><SkipForward size={10}/></button>
              <button className="quick-act" onClick={e=>{e.stopPropagation();onSnooze(task.id);}} title="Snooze"><Clock size={10}/></button>
            </>}
            {task.priority&&<Star size={10} style={{color:'var(--amber)',fill:'var(--amber)'}}/>}
            <ChevronRight size={12} style={{color:selected?'var(--accent)':'var(--text3)'}}/>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
TaskRow.defaultProps={showProject:true,showQuickActions:false};

/* ========== MAIN APP ========== */
export default function App(){
  const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
  const todayStr=fmtDO(now);
  const tmrwStr=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+1);return fmtDO(d);},[]);

  const[view,setView]=useState('today');const[calView,setCalView]=useState('week');
  const[cd,setCd]=useState({year:now.getFullYear(),month:now.getMonth(),day:now.getDate()});
  const[events,setEvents]=useState([]);const[tasks,setTasks]=useState([]);const[projects,setProjects]=useState([]);
  const[categories,setCategories]=useState(DEFAULT_CATS);const[tags,setTags]=useState([]);const[dbLoaded,setDbLoaded]=useState(false);
  const[selectedTaskId,setSelectedTaskId]=useState(null);const[modalOpen,setModalOpen]=useState(false);
  const[editEv,setEditEv]=useState(null);const[selDate,setSelDate]=useState(todayStr);
  const[ds,setDs]=useState(540);const[de,setDe]=useState(600);const[sq,setSq]=useState('');
  const[visCats,setVisCats]=useState(DEFAULT_CATS.map(c=>c.id));const[curEnergy,setCurEnergy]=useState('medium');
  const[ctxFilter,setCtxFilter]=useState('all');const[sideCollapsed,setSideCollapsed]=useState(false);
  const[showCapture,setShowCapture]=useState(false);const[captureInput,setCaptureInput]=useState('');
  const[showFocus,setShowFocus]=useState(false);const[focusTaskId,setFocusTaskId]=useState(null);
  const[pomSec,setPomSec]=useState(1500);const[pomRun,setPomRun]=useState(false);const[pomMode,setPomMode]=useState('work');
  const[reviewStep,setReviewStep]=useState(0);const[reviewChecks,setReviewChecks]=useState([false,false,false,false,false]);
  const[procTaskId,setProcTaskId]=useState(null);const[procStep,setProcStep]=useState(0);
  const[procCtx,setProcCtx]=useState('computer');const[procEnergy,setProcEnergy]=useState('medium');
  const[procTime,setProcTime]=useState(30);const[procProject,setProcProject]=useState(null);
  const[procStartDate,setProcStartDate]=useState('');const[procDueDate,setProcDueDate]=useState('');
  const[editField,setEditField]=useState(null);const[editValue,setEditValue]=useState('');
  const[delegateValue,setDelegateValue]=useState('');
  const[newSubInput,setNewSubInput]=useState('');
  const[toasts,setToasts]=useState([]);const[dragType,setDragType]=useState(null);const[selection,setSelection]=useState(null);
  const[movId,setMovId]=useState(null);const[resId,setResId]=useState(null);
  const[selectedProjId,setSelectedProjId]=useState(null);const[showNewProj,setShowNewProj]=useState(false);
  const[newProjTitle,setNewProjTitle]=useState('');const[newProjDesc,setNewProjDesc]=useState('');
  const[newProjColor,setNewProjColor]=useState('#7d8a9a');const[newProjParent,setNewProjParent]=useState(null);
  const[confirmDeleteProj,setConfirmDeleteProj]=useState(null);
  const[showTagPicker,setShowTagPicker]=useState(false);const[newTagName,setNewTagName]=useState('');const[newTagHex,setNewTagHex]=useState('#a87080');
  const[todayExpanded,setTodayExpanded]=useState(false);
  const[showTimeline,setShowTimeline]=useState(true);const[reminders,setReminders]=useState([]);
  const[dismissedReminders,setDismissedReminders]=useState({});const[dropHighlight,setDropHighlight]=useState(false);
  const[touchDragTask,setTouchDragTask]=useState(null);
  const[globalSearch,setGlobalSearch]=useState('');

  const evRef=useRef(events);useEffect(()=>{evRef.current=events;},[events]);
  const tasksRef=useRef(tasks);useEffect(()=>{tasksRef.current=tasks;},[tasks]);
  const colRefs=useRef({});const scrollRef=useRef(null);const todayScrollRef=useRef(null);
  const scKey=useRef('');const todayScKey=useRef('');const dragRef=useRef({type:null});
  const lastMouseY=useRef(0);const autoScrollRef=useRef(null);const captureRef=useRef(null);
  const isTouchRef=useRef(false);
  const touchColRef=useRef(null);const touchTaskRef=useRef(null);
  const longPressTimer=useRef(null);const taskLongPressTimer=useRef(null);
  const bodyScrollLockedRef=useRef(false);

  const lockBodyScroll=useCallback(()=>{if(bodyScrollLockedRef.current)return;bodyScrollLockedRef.current=true;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';document.body.style.touchAction='none';},[]);
  const unlockBodyScroll=useCallback(()=>{if(!bodyScrollLockedRef.current)return;bodyScrollLockedRef.current=false;document.body.style.overflow='';document.documentElement.style.overflow='';document.body.style.touchAction='';},[]);

  useEffect(()=>{(async()=>{try{const[dt,de2,dp,dtg,dcat]=await Promise.all([dbGetAll('tasks'),dbGetAll('events'),dbGetAll('projects'),dbGetAll('tags'),dbGetAll('categories')]);if(dt.length>0)setTasks(dt);if(de2.length>0)setEvents(de2);if(dp.length>0)setProjects(dp);if(dtg.length>0)setTags(dtg);if(dcat.length>0){setCategories(dcat);setVisCats(dcat.map(c=>c.id));}}catch(e){}setDbLoaded(true);})();},[]);
  useEffect(()=>{if(dbLoaded)dbPutAll('tasks',tasks).catch(()=>{});},[tasks,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbPutAll('events',events).catch(()=>{});},[events,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbPutAll('projects',projects).catch(()=>{});},[projects,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbPutAll('tags',tags).catch(()=>{});},[tags,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbPutAll('categories',categories).catch(()=>{});},[categories,dbLoaded]);
  useEffect(()=>()=>{clearTimeout(longPressTimer.current);clearTimeout(taskLongPressTimer.current);if(autoScrollRef.current)cancelAnimationFrame(autoScrollRef.current);unlockBodyScroll();},[unlockBodyScroll]);

  const selectedTask=useMemo(()=>tasks.find(t=>t.id===selectedTaskId),[tasks,selectedTaskId]);
  const inboxTasks=useMemo(()=>tasks.filter(t=>t.status==='inbox'),[tasks]);
  const nextTasks=useMemo(()=>tasks.filter(t=>t.status==='next'),[tasks]);
  const waitingTasks=useMemo(()=>tasks.filter(t=>t.status==='waiting'),[tasks]);
  const somedayTasks=useMemo(()=>tasks.filter(t=>t.status==='someday'),[tasks]);
  const doneTasks=useMemo(()=>tasks.filter(t=>t.status==='done'),[tasks]);
  const scheduledMap=useMemo(()=>{const m={};events.forEach(ev=>{if(ev.taskId&&!m[ev.taskId])m[ev.taskId]=ev;});return m;},[events]);
  const getCat=useCallback(cid=>categories.find(c=>c.id===cid)||categories[0],[categories]);
  const expRange=useMemo(()=>{const c=new Date(cd.year,cd.month,15);const s=new Date(c);s.setMonth(s.getMonth()-2);const e=new Date(c);e.setMonth(e.getMonth()+2);return{s,e};},[cd.year,cd.month]);
  const expanded=useMemo(()=>expandRec(events,expRange.s,expRange.e),[events,expRange]);
  const filteredEvents=useMemo(()=>{const q=sq.trim().toLowerCase();return expanded.filter(e=>visCats.includes(e.category)&&(!q||e.title.toLowerCase().includes(q)));},[expanded,visCats,sq]);
  const todayEvents=useMemo(()=>filteredEvents.filter(e=>e.date===todayStr),[filteredEvents,todayStr]);
  const todayTasks=useMemo(()=>tasks.filter(t=>{if(t.status==='done'||t.status==='inbox'||t.status==='someday')return false;if(t.dueDate&&t.dueDate<=todayStr)return true;if(t.startDate&&t.startDate<=todayStr)return true;const sch=scheduledMap[t.id];if(sch&&sch.date===todayStr)return true;if(t.status==='next'&&t.priority)return true;if(t.status==='next'&&!t.startDate&&!t.dueDate&&t.energy===curEnergy)return true;return false;}).sort((a,b)=>{const ao=a.dueDate&&a.dueDate<todayStr?1:0;const bo=b.dueDate&&b.dueDate<todayStr?1:0;if(bo!==ao)return bo-ao;if((b.priority?1:0)!==(a.priority?1:0))return(b.priority?1:0)-(a.priority?1:0);return 0;}),[tasks,scheduledMap,curEnergy,todayStr]);
  const todayDoneCount=useMemo(()=>tasks.filter(t=>t.status==='done'&&t.completedAt===todayStr).length,[tasks,todayStr]);
  const overdueCount=useMemo(()=>todayTasks.filter(t=>t.dueDate&&t.dueDate<todayStr).length,[todayTasks,todayStr]);
  const rootProjects=useMemo(()=>projects.filter(p=>!p.parentId),[projects]);
  const getChildren=useCallback(pid=>projects.filter(p=>p.parentId===pid),[projects]);
  const getProjectPath=useCallback(pid=>{const path=[];let cur=projects.find(p=>p.id===pid);while(cur){path.unshift(cur);cur=cur.parentId?projects.find(p=>p.id===cur.parentId):null;}return path;},[projects]);
  const getProjectProgress=useCallback(pid=>{const dt=tasks.filter(t=>t.project===pid);const ch=projects.filter(p=>p.parentId===pid);let total=dt.length,done=dt.filter(t=>t.status==='done').length;ch.forEach(c=>{const cp=getProjectProgress(c.id);total+=cp.total;done+=cp.done;});return{total,done,pct:total>0?Math.round((done/total)*100):0};},[tasks,projects]);
  const weekDays=useMemo(()=>{const d=new Date(cd.year,cd.month,cd.day);const dow=d.getDay();const mo=dow===0?-6:1-dow;const mon=new Date(d);mon.setDate(d.getDate()+mo);return Array.from({length:7},(_,i)=>{const dd=new Date(mon);dd.setDate(mon.getDate()+i);return{date:dd,dateStr:fmtDO(dd),dayName:DAYS_SHORT[i],dayNum:dd.getDate(),isToday:fmtDO(dd)===todayStr};});},[cd,todayStr]);
  const calCells=useMemo(()=>{const dim=gDIM(cd.year,cd.month),fd=gMDOW(cd.year,cd.month),pDim=cd.month===0?gDIM(cd.year-1,11):gDIM(cd.year,cd.month-1);const c=[];for(let i=fd-1;i>=0;i--)c.push({day:pDim-i,current:false,month:cd.month===0?11:cd.month-1,year:cd.month===0?cd.year-1:cd.year});for(let d=1;d<=dim;d++)c.push({day:d,current:true,month:cd.month,year:cd.year});const rem=42-c.length;for(let d=1;d<=rem;d++)c.push({day:d,current:false,month:cd.month===11?0:cd.month+1,year:cd.month===11?cd.year+1:cd.year});return c;},[cd.year,cd.month]);
  const searchResults=useMemo(()=>{if(!globalSearch.trim())return[];const q=globalSearch.toLowerCase();return tasks.filter(t=>t.title.toLowerCase().includes(q)||(t.notes||'').toLowerCase().includes(q)).slice(0,8);},[tasks,globalSearch]);
  const ringData=useMemo(()=>{const done=todayDoneCount;const todo=todayTasks.length;if(done===0&&todo===0)return[{v:0},{v:1}];return[{v:done},{v:Math.max(todo,0)}];},[todayDoneCount,todayTasks.length]);
  const todayPct=useMemo(()=>{const total=todayDoneCount+todayTasks.length;return total>0?Math.round((todayDoneCount/total)*100):0;},[todayDoneCount,todayTasks.length]);

  const addToast=useCallback(msg=>{const id=Date.now();setToasts(p=>[...p,{id,msg}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),2500);},[]);
  useEffect(()=>{if(showCapture&&captureRef.current)captureRef.current.focus();},[showCapture]);
  useEffect(()=>{if(!pomRun)return;const iv=setInterval(()=>setPomSec(p=>{if(p<=1){setPomRun(false);return 0;}return p-1;}),1000);return()=>clearInterval(iv);},[pomRun]);
  useEffect(()=>{const h=e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;if(e.key==='n'&&!showCapture&&!modalOpen){e.preventDefault();setShowCapture(true);}if(e.key==='Escape'){setShowCapture(false);setShowFocus(false);setSelectedTaskId(null);setProcTaskId(null);setModalOpen(false);setConfirmDeleteProj(null);setShowTagPicker(false);setGlobalSearch('');}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[showCapture,modalOpen]);
  useEffect(()=>{const check=()=>{const items=[];const hr=new Date().getHours();tasks.forEach(t=>{if(t.status==='done'||t.status==='inbox'||t.status==='someday')return;if(dismissedReminders[t.id])return;if(t.dueDate&&t.dueDate<todayStr)items.push({taskId:t.id,type:'overdue',title:t.title});else if(t.dueDate===todayStr&&hr>=14)items.push({taskId:t.id,type:'due-today',title:t.title});else if(t.priority&&t.status==='next'&&hr>=16)items.push({taskId:t.id,type:'priority',title:t.title});});setReminders(items.slice(0,3));};check();const iv=setInterval(check,30000);return()=>clearInterval(iv);},[tasks,dismissedReminders,todayStr]);

  const updateTask=useCallback((id,upd)=>setTasks(p=>p.map(t=>t.id===id?{...t,...upd}:t)),[]);
  const deleteTask=useCallback(id=>{setTasks(p=>p.filter(t=>t.id!==id));setSelectedTaskId(p=>p===id?null:p);},[]);
  const selectTask=useCallback(id=>{setSelectedTaskId(p=>p===id?null:id);setEditField(null);setShowTagPicker(false);},[]);
  const handleCapture=useCallback(()=>{if(!captureInput.trim())return;setTasks(p=>[...p,{id:'t'+Date.now(),title:captureInput.trim(),notes:'',status:'inbox',project:null,context:null,energy:null,timeEst:null,dueDate:null,startDate:null,priority:false,delegatedTo:'',subtasks:[],tags:[],createdAt:todayStr,completedAt:null}]);setCaptureInput('');setShowCapture(false);addToast('Captured to Inbox');},[captureInput,todayStr,addToast]);

  const handleSaveEv=useCallback(ev=>{const wantTask=ev._createTask;delete ev._createTask;if(wantTask&&!ev.taskId){const taskId='t'+Date.now();setTasks(p=>[...p,{id:taskId,title:ev.title,notes:ev.description||'',status:'next',project:null,context:null,energy:null,timeEst:Math.round(ev.endMin-ev.startMin),dueDate:ev.date,startDate:ev.date,priority:false,delegatedTo:'',subtasks:[],tags:[],createdAt:todayStr,completedAt:null}]);ev.taskId=taskId;}setEvents(p=>{const i=p.findIndex(e=>e.id===ev.id);return i>=0?p.map((e,idx)=>idx===i?ev:e):[...p,ev];});addToast(wantTask?'Task & event created':editEv?'Event updated':'Event created');},[addToast,editEv,todayStr]);

  const handleDelEv=useCallback(id=>{setEvents(p=>p.filter(e=>e.id!==id));addToast('Event deleted');},[addToast]);
  const addProject=useCallback(()=>{if(!newProjTitle.trim())return;setProjects(p=>[...p,{id:Date.now(),title:newProjTitle.trim(),desc:newProjDesc.trim(),color:newProjColor,parentId:newProjParent}]);setNewProjTitle('');setNewProjDesc('');setNewProjColor('#7d8a9a');setNewProjParent(null);setShowNewProj(false);addToast('Project created');},[newProjTitle,newProjDesc,newProjColor,newProjParent,addToast]);
  const deleteProjectRecursive=useCallback(id=>{setProjects(prev=>{const toDelete=new Set();const collectIds=pid=>{toDelete.add(pid);prev.filter(p=>p.parentId===pid).forEach(c=>collectIds(c.id));};collectIds(id);return prev.filter(p=>!toDelete.has(p.id));});setTasks(p=>p.map(t=>t.project===id?{...t,project:null}:t));setSelectedProjId(p=>p===id?null:p);setConfirmDeleteProj(null);addToast('Project deleted');},[addToast]);
  const addCategory=useCallback((name,hex)=>{const id='cat_'+Date.now();setCategories(p=>[...p,{id,name,hex}]);setVisCats(p=>[...p,id]);addToast('Category created');},[addToast]);
  const addTag=useCallback((name,hex)=>{const id='tag_'+Date.now();setTags(p=>[...p,{id,name,hex}]);addToast('Tag created');return id;},[addToast]);
  const deleteTag=useCallback(id=>{setTags(p=>p.filter(t=>t.id!==id));setTasks(p=>p.map(t=>({...t,tags:(t.tags||[]).filter(tid=>tid!==id)})));addToast('Tag removed');},[addToast]);
  const toggleTaskTag=useCallback((taskId,tagId)=>{setTasks(p=>p.map(t=>{if(t.id!==taskId)return t;const tgs=t.tags||[];return{...t,tags:tgs.includes(tagId)?tgs.filter(x=>x!==tagId):[...tgs,tagId]};}));},[]);
  const markDone=useCallback(id=>{setTasks(p=>p.map(t=>{if(t.id!==id)return t;const newS=t.status==='done'?'next':'done';return{...t,status:newS,completedAt:newS==='done'?todayStr:null};}));},[todayStr]);
  const moveToTomorrow=useCallback(id=>{updateTask(id,{startDate:tmrwStr});addToast('Moved to tomorrow');},[updateTask,addToast,tmrwStr]);
  const snoozeTask=useCallback(id=>{updateTask(id,{startDate:tmrwStr});addToast('Snoozed');},[updateTask,addToast,tmrwStr]);

  const handleProcess=useCallback((tid,action)=>{
    if(action==='delete'){deleteTask(tid);setProcTaskId(null);setProcStep(0);}
    else if(action==='someday'){updateTask(tid,{status:'someday'});setProcTaskId(null);setProcStep(0);addToast('Moved to Someday');}
    else if(action==='next'){setProcStep(1);const t=tasksRef.current.find(x=>x.id===tid);if(t){setProcCtx(suggestCtx(t.title));setProcEnergy(suggestEn(t.title));setProcTime(suggestEn(t.title)==='high'?90:45);setProcProject(null);setProcStartDate(t.startDate||todayStr);setProcDueDate(t.dueDate||'');}}
    else if(action==='waiting'){setProcStep(3);setDelegateValue('');}
    else if(action==='confirm-next'){updateTask(tid,{status:'next',context:procCtx,energy:procEnergy,timeEst:procTime,project:procProject,startDate:procStartDate||null,dueDate:procDueDate||null});setProcTaskId(null);setProcStep(0);addToast('Moved to Next Actions');}
    else if(action==='confirm-waiting'){updateTask(tid,{status:'waiting',delegatedTo:delegateValue||'Someone',dueDate:procDueDate||null});setProcTaskId(null);setProcStep(0);setDelegateValue('');addToast('Delegated');}
  },[deleteTask,updateTask,addToast,todayStr,procCtx,procEnergy,procTime,procProject,procStartDate,procDueDate,delegateValue]);

  const getMin=useCallback((cY,key)=>{const el=colRefs.current[key];if(!el)return 0;return yToM(cY-el.getBoundingClientRect().top);},[]);
  const getMinR=useCallback((cY,key)=>{const el=colRefs.current[key];if(!el)return 0;return yToMR(cY-el.getBoundingClientRect().top);},[]);
  const findCol=useCallback(cX=>{for(const[k,el]of Object.entries(colRefs.current)){if(!el?.isConnected)continue;const r=el.getBoundingClientRect();if(cX>=r.left&&cX<=r.right)return k;}return null;},[]);
  const bUpdate=useCallback((id,ch)=>setEvents(p=>p.map(e=>e.id===id?{...e,...ch}:e)),[]);
  const getActiveScroll=useCallback(()=>{if(view==='today'&&todayScrollRef.current)return todayScrollRef.current;if(scrollRef.current)return scrollRef.current;return null;},[view]);
  const startAS=useCallback(()=>{const tick=()=>{const sc=getActiveScroll();if(!sc){autoScrollRef.current=requestAnimationFrame(tick);return;}const r=sc.getBoundingClientRect();const y=lastMouseY.current;if(y<r.top+50)sc.scrollTop-=8;else if(y>r.bottom-50)sc.scrollTop+=8;autoScrollRef.current=requestAnimationFrame(tick);};autoScrollRef.current=requestAnimationFrame(tick);},[getActiveScroll]);
  const stopAS=useCallback(()=>{if(autoScrollRef.current){cancelAnimationFrame(autoScrollRef.current);autoScrollRef.current=null;}},[]);
  const pSnap=useCallback(eid=>{requestAnimationFrame(()=>{const ev=evRef.current.find(x=>x.id===eid);if(ev){let ss=snap(ev.startMin),se=snap(ev.endMin);if(se<=ss)se=ss+SN;bUpdate(eid,{startMin:ss,endMin:se});}});},[bUpdate]);

  const handleDragMove=useCallback((clientX,clientY)=>{lastMouseY.current=clientY;const d=dragRef.current;if(!d||!d.type)return;const hk=findCol(clientX);if(d.type==='create'){const min=getMin(clientY,hk||d.dateStr);d.curMin=min;const s=Math.min(d.startMin,min),en=Math.max(d.startMin,min)+SN;setSelection({dateStr:d.dateStr,startMin:s,endMin:Math.min(en,1440)});}else if(d.type==='move'&&hk){d.moved=true;const raw=getMinR(clientY,hk);const ev=evRef.current.find(x=>x.id===d.eventId);if(!ev)return;const dur=ev.endMin-ev.startMin;bUpdate(d.eventId,{date:hk,startMin:Math.max(0,Math.min(raw-d.offMin,1440-dur)),endMin:Math.max(0,Math.min(raw-d.offMin,1440-dur))+dur});}else if(d.type==='resize-bottom'&&hk){const raw=getMinR(clientY,hk);const ev=evRef.current.find(x=>x.id===d.eventId);if(ev)bUpdate(d.eventId,{endMin:Math.min(Math.max(raw,ev.startMin+5),1440)});}else if(d.type==='resize-top'&&hk){const raw=getMinR(clientY,hk);const ev=evRef.current.find(x=>x.id===d.eventId);if(ev)bUpdate(d.eventId,{startMin:Math.max(0,Math.min(raw,ev.endMin-5))});}},[findCol,getMin,getMinR,bUpdate]);

  const handleDragEnd=useCallback(()=>{stopAS();const d=dragRef.current;if(!d||!d.type)return;if(d.type==='create'){const s=Math.min(d.startMin,d.curMin??d.startMin),en=Math.max(d.startMin,d.curMin??d.startMin)+SN;setDs(s);setDe(Math.min(en,1440));setSelDate(d.dateStr);setEditEv(null);setModalOpen(true);}else if(d.type==='move'){if(!d.moved){const ev=evRef.current.find(x=>x.id===d.eventId);if(ev){setEditEv({...ev});setModalOpen(true);}}else pSnap(d.eventId);}else if(d.type.startsWith('resize'))pSnap(d.eventId);dragRef.current={type:null};setDragType(null);setSelection(null);setMovId(null);setResId(null);},[stopAS,pSnap]);

  const onColDown=useCallback((e,dateStr)=>{if(e.button!==0||modalOpen||isTouchRef.current)return;const resEl=e.target.closest('[data-resize]');const evEl=e.target.closest('[data-event-id]');if(resEl){e.preventDefault();e.stopPropagation();const par=resEl.closest('[data-event-id]');const eid=par.dataset.eventId;dragRef.current={type:`resize-${resEl.dataset.resize}`,eventId:eid,dateStr};setDragType(`resize-${resEl.dataset.resize}`);setResId(eid);startAS();}else if(evEl){e.preventDefault();const eid=evEl.dataset.eventId;if(evEl.dataset.recurring==='true'){const b=evRef.current.find(x=>x.id===eid);if(b){setEditEv({...b});setModalOpen(true);}return;}const ev=evRef.current.find(x=>x.id===eid);if(!ev)return;const min=getMinR(e.clientY,dateStr);dragRef.current={type:'move',eventId:eid,dateStr,offMin:min-ev.startMin,moved:false};setDragType('move');setMovId(eid);startAS();}else{e.preventDefault();const min=getMin(e.clientY,dateStr);dragRef.current={type:'create',dateStr,startMin:min,curMin:min};setDragType('create');setSelection({dateStr,startMin:min,endMin:min+SN});startAS();}},[getMin,getMinR,modalOpen,startAS]);

  const onMM=useCallback(e=>handleDragMove(e.clientX,e.clientY),[handleDragMove]);
  const onMU=useCallback(()=>handleDragEnd(),[handleDragEnd]);

  const onColTouchStart=useCallback((e,dateStr)=>{if(e.cancelable)e.preventDefault();if(modalOpen)return;isTouchRef.current=true;const t=e.touches[0];if(!t)return;const resEl=e.target.closest('[data-resize]');const evEl=e.target.closest('[data-event-id]');if(evEl&&evEl.dataset.recurring==='true'){touchColRef.current={startX:t.clientX,startY:t.clientY,dateStr,evId:evEl.dataset.eventId,isRec:true,resDir:null,startTime:Date.now(),moved:false,dragging:false,pressActivated:false};return;}if(evEl&&!resEl){const eid=evEl.dataset.eventId;const ev=evRef.current.find(x=>x.id===eid);if(!ev)return;const min=getMinR(t.clientY,dateStr);touchColRef.current={startX:t.clientX,startY:t.clientY,dateStr,evId:eid,isRec:false,resDir:null,startTime:Date.now(),moved:false,dragging:true,pressActivated:true};dragRef.current={type:'move',eventId:eid,dateStr,offMin:min-ev.startMin,moved:false};setDragType('move');setMovId(eid);lockBodyScroll();startAS();return;}touchColRef.current={startX:t.clientX,startY:t.clientY,dateStr,evId:null,isRec:false,resDir:resEl?.dataset?.resize||null,startTime:Date.now(),moved:false,dragging:false,pressActivated:false};clearTimeout(longPressTimer.current);longPressTimer.current=setTimeout(()=>{const tc=touchColRef.current;if(!tc||tc.moved||tc.dragging)return;tc.pressActivated=true;tc.dragging=true;lockBodyScroll();if(tc.resDir){dragRef.current={type:`resize-${tc.resDir}`,eventId:tc.evId,dateStr};setDragType(`resize-${tc.resDir}`);setResId(tc.evId);startAS();return;}const min=getMin(tc.startY,tc.dateStr);dragRef.current={type:'create',dateStr:tc.dateStr,startMin:min,curMin:min};setDragType('create');setSelection({dateStr:tc.dateStr,startMin:min,endMin:min+SN});startAS();},180);},[modalOpen,getMin,getMinR,startAS,lockBodyScroll]);

  const onTaskTouchStart=useCallback((e,taskId,title,timeEst)=>{isTouchRef.current=true;const t=e.touches[0];if(!t)return;touchTaskRef.current={taskId,title,timeEst:timeEst||30,startX:t.clientX,startY:t.clientY,active:false};clearTimeout(taskLongPressTimer.current);taskLongPressTimer.current=setTimeout(()=>{const tt=touchTaskRef.current;if(!tt)return;tt.active=true;lockBodyScroll();setTouchDragTask({taskId:tt.taskId,title:tt.title,x:tt.startX,y:tt.startY});},180);},[lockBodyScroll]);

  useEffect(()=>{const onTouchMove=(e)=>{const t=e.touches[0];if(!t)return;lastMouseY.current=t.clientY;const tc=touchColRef.current;if(tc&&tc.evId&&tc.dragging&&dragRef.current?.type==='move'){const dx=Math.abs(t.clientX-tc.startX),dy=Math.abs(t.clientY-tc.startY);if(dx>4||dy>4){tc.moved=true;dragRef.current.moved=true;}if(e.cancelable)e.preventDefault();handleDragMove(t.clientX,t.clientY);}else if(tc&&!tc.dragging&&!tc.moved){const dx=Math.abs(t.clientX-tc.startX),dy=Math.abs(t.clientY-tc.startY);if(dx>10||dy>10){tc.moved=true;clearTimeout(longPressTimer.current);if(tc.pressActivated){tc.dragging=true;lockBodyScroll();}else{touchColRef.current=null;}}}else if(tc&&tc.dragging&&dragRef.current?.type){if(e.cancelable)e.preventDefault();handleDragMove(t.clientX,t.clientY);}const tt=touchTaskRef.current;if(tt&&!tt.active){const dx=Math.abs(t.clientX-tt.startX),dy=Math.abs(t.clientY-tt.startY);if(dx>10||dy>10){clearTimeout(taskLongPressTimer.current);touchTaskRef.current=null;return;}}if(tt&&tt.active){e.preventDefault();setTouchDragTask(prev=>prev?{...prev,x:t.clientX,y:t.clientY}:null);}};const onTouchEnd=(e)=>{clearTimeout(longPressTimer.current);clearTimeout(taskLongPressTimer.current);const ct=e.changedTouches?.[0];const tc=touchColRef.current;if(tc){if(tc.dragging){handleDragEnd();}else if(!tc.moved){const elapsed=Date.now()-tc.startTime;if(elapsed<500){if(tc.evId){const ev=evRef.current.find(x=>x.id===tc.evId);if(ev){setEditEv({...ev});setModalOpen(true);}}else{const min=getMin(tc.startY,tc.dateStr);setDs(min);setDe(Math.min(min+30,1440));setSelDate(tc.dateStr);setEditEv(null);setModalOpen(true);}}}touchColRef.current=null;}const tt=touchTaskRef.current;if(tt&&tt.active&&ct){const col=findCol(ct.clientX);if(col){const el=colRefs.current[col];if(el){const min=yToM(ct.clientY-el.getBoundingClientRect().top);const dur=tt.timeEst||30;const task=tasksRef.current.find(x=>x.id===tt.taskId);setEvents(p=>[...p,{id:'e'+Date.now(),title:task?.title||tt.title,date:col,startMin:min,endMin:Math.min(min+dur,1440),category:'work',recurrence:'none',recurrenceEnd:'',taskId:tt.taskId,description:''}]);addToast('Task scheduled');}}setTouchDragTask(null);touchTaskRef.current=null;}else{touchTaskRef.current=null;setTouchDragTask(null);}unlockBodyScroll();setTimeout(()=>{isTouchRef.current=false;},100);};const onTouchCancel=()=>{clearTimeout(longPressTimer.current);clearTimeout(taskLongPressTimer.current);touchColRef.current=null;touchTaskRef.current=null;setTouchDragTask(null);unlockBodyScroll();setTimeout(()=>{isTouchRef.current=false;},100);};window.addEventListener('touchmove',onTouchMove,{passive:false});window.addEventListener('touchend',onTouchEnd);window.addEventListener('touchcancel',onTouchCancel);return()=>{window.removeEventListener('touchmove',onTouchMove);window.removeEventListener('touchend',onTouchEnd);window.removeEventListener('touchcancel',onTouchCancel);};},[handleDragMove,handleDragEnd,getMin,findCol,addToast,unlockBodyScroll,lockBodyScroll]);

  useEffect(()=>{window.addEventListener('mousemove',onMM);window.addEventListener('mouseup',onMU);return()=>{window.removeEventListener('mousemove',onMM);window.removeEventListener('mouseup',onMU);};},[onMM,onMU]);

  const handleTaskDrop=useCallback((e,dateStr)=>{e.preventDefault();setDropHighlight(false);const taskId=e.dataTransfer.getData('taskId');if(!taskId)return;const task=tasksRef.current.find(t=>t.id===taskId);if(!task)return;const el=colRefs.current[dateStr];if(!el)return;const min=yToM(e.clientY-el.getBoundingClientRect().top);const dur=task.timeEst||30;setEvents(p=>[...p,{id:'e'+Date.now(),title:task.title,date:dateStr,startMin:min,endMin:Math.min(min+dur,1440),category:'work',recurrence:'none',recurrenceEnd:'',taskId:task.id,description:''}]);addToast('Task scheduled');},[addToast]);

  const nav=d=>{setCd(p=>{if(calView==='month'){let m=p.month+d,y=p.year;if(m<0){m=11;y--;}else if(m>11){m=0;y++;}return{...p,year:y,month:m};}else{const dt=new Date(p.year,p.month,p.day+d*7);return{year:dt.getFullYear(),month:dt.getMonth(),day:dt.getDate()};}});};
  const goToday=()=>setCd({year:now.getFullYear(),month:now.getMonth(),day:now.getDate()});
  const setSEl=useCallback(el=>{scrollRef.current=el;const k=`cal-${calView}-${cd.year}-${cd.month}-${cd.day}`;if(el&&k!==scKey.current){scKey.current=k;el.scrollTop=mToY(7.5*60);}},[calView,cd]);
  const setTodaySEl=useCallback(el=>{todayScrollRef.current=el;const k='today-scroll';if(el&&k!==todayScKey.current){todayScKey.current=k;el.scrollTop=mToY(Math.max(0,nowMin-60));}},[nowMin]);

  const renderCol=(dateStr,dayEvs,isToday,fullWidth,acceptDrop)=>{
    const activeId=movId||resId;const staticEvs=activeId?dayEvs.filter(ev=>(ev._bid||ev.id)!==activeId):dayEvs;
    const activeEvts=activeId?dayEvs.filter(ev=>(ev._bid||ev.id)===activeId):[];const laid=layoutOL(staticEvs);
    return(
      <div key={dateStr} ref={el=>{colRefs.current[dateStr]=el;}} style={{position:'relative',flex:1,minHeight:HH*24,borderRight:fullWidth?'none':'1px solid var(--border)',background:isToday?(dropHighlight?'rgba(196,182,156,0.06)':'rgba(255,255,255,0.015)'):''}} onMouseDown={e=>onColDown(e,dateStr)} onTouchStart={e=>onColTouchStart(e,dateStr)} onDragOver={acceptDrop?e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';setDropHighlight(true);}:undefined} onDragLeave={acceptDrop?()=>setDropHighlight(false):undefined} onDrop={acceptDrop?e=>handleTaskDrop(e,dateStr):undefined}>
        {HOURS.map(h=><React.Fragment key={h}><div style={{position:'absolute',width:'100%',borderBottom:'1px solid var(--border)',top:h*HH,height:HH}}/><div style={{position:'absolute',width:'100%',borderBottom:'1px dashed rgba(255,255,255,0.03)',top:h*HH+HH/2}}/></React.Fragment>)}
        {isToday&&<div style={{position:'absolute',width:'100%',zIndex:30,pointerEvents:'none',top:mToY(nowMin)}}><div style={{display:'flex',alignItems:'center'}}><div className="today-line-dot"/><div style={{flex:1,height:2,background:'linear-gradient(90deg,var(--rose),transparent)'}}/></div></div>}
        {selection&&selection.dateStr===dateStr&&<div style={{position:'absolute',left:2,right:2,borderRadius:8,zIndex:10,pointerEvents:'none',top:mToY(selection.startMin),height:Math.max(mToY(selection.endMin-selection.startMin),16),border:'2px dashed var(--accent)',background:'rgba(196,182,156,0.08)'}}><div style={{padding:'2px 6px',fontSize:10,fontWeight:700,color:'var(--accent)'}}>{fmtT(selection.startMin)} – {fmtT(selection.endMin)}</div></div>}
        {laid.map(ev=>{const top=mToY(ev.startMin),height=Math.max(mToY(ev.endMin-ev.startMin),24);const c=getCat(ev.category);const isRec=ev._rec;const evId=ev._bid||ev.id;const colW=100/ev._totalCols,colL=ev._col*colW;const isLinked=ev.taskId!=null;
          return<div key={`${evId}-${ev.date}-${ev._col}`} data-event-id={evId} data-recurring={isRec?'true':undefined} className="cal-event" style={{position:'absolute',top,height,left:`calc(${colL}% + 2px)`,width:`calc(${colW}% - 4px)`,zIndex:20,cursor:isRec?'pointer':'grab',borderRadius:8,overflow:'hidden',color:'#fff'}}>
            <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${c.hex},${hRgba(c.hex,0.6)})`,borderRadius:8}}/>
            {!isRec&&<div data-resize="top" style={{position:'absolute',top:0,left:0,right:0,height:8,zIndex:30,cursor:'ns-resize'}}/>}
            <div style={{position:'relative',padding:'3px 7px',overflow:'hidden',height:height-6,pointerEvents:'none'}}><div style={{fontSize:11,fontWeight:700,lineHeight:1.3,display:'flex',alignItems:'center',gap:3,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{isRec&&<Repeat size={8} style={{opacity:0.8,flexShrink:0}}/>}{isLinked&&<Link2 size={8} style={{opacity:0.8,flexShrink:0}}/>}{ev.title}</div>{height>=40&&<div style={{fontSize:10,opacity:0.8,marginTop:1}}>{fmtS(ev.startMin)} – {fmtS(ev.endMin)}</div>}</div>
            {!isRec&&<div data-resize="bottom" style={{position:'absolute',bottom:0,left:0,right:0,height:8,zIndex:30,cursor:'ns-resize'}}/>}
          </div>;
        })}
        {activeEvts.map(ev=>{const top=mToY(ev.startMin),height=Math.max(mToY(ev.endMin-ev.startMin),24);const c=getCat(ev.category);const evId=ev._bid||ev.id;
          return<div key={`a-${evId}`} data-event-id={evId} style={{position:'absolute',left:2,right:2,overflow:'hidden',color:'#fff',top,height,zIndex:50,borderRadius:10,cursor:movId?'grabbing':'ns-resize',transform:'scale(1.02)',boxShadow:`0 16px 40px rgba(0,0,0,0.6),0 0 0 2px ${hRgba(c.hex,0.6)}`}}>
            <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${c.hex},${hRgba(c.hex,0.6)})`,borderRadius:10}}/>
            <div data-resize="top" style={{position:'absolute',top:0,left:0,right:0,height:10,zIndex:30,cursor:'ns-resize'}}/>
            <div style={{position:'relative',padding:'4px 8px',pointerEvents:'none'}}><div style={{fontSize:11,fontWeight:700,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{ev.title}</div>{height>=40&&<div style={{fontSize:10,opacity:0.8,marginTop:1}}>{fmtS(ev.startMin)} – {fmtS(ev.endMin)}</div>}</div>
            <div data-resize="bottom" style={{position:'absolute',bottom:0,left:0,right:0,height:10,zIndex:30,cursor:'ns-resize'}}/>
          </div>;
        })}
      </div>
    );
  };

  const renderDetail=()=>{
    if(!selectedTask)return(<div className="empty-state"><div className="empty-icon"><Eye size={22} style={{color:'var(--text3)'}}/></div><p className="empty-title">No task selected</p><p className="empty-sub">Click any task to view details</p></div>);
    const stCount=countSt(selectedTask.subtasks);const en=ENERGY.find(e=>e.id===selectedTask.energy);const projPath=selectedTask.project?getProjectPath(selectedTask.project):[];
    const handleStToggle=id=>updateTask(selectedTask.id,{subtasks:toggleStInTree(selectedTask.subtasks,id)});const handleStDel=id=>updateTask(selectedTask.id,{subtasks:delStFromTree(selectedTask.subtasks,id)});const handleStAddChild=(pid,title)=>updateTask(selectedTask.id,{subtasks:addStChild(selectedTask.subtasks,pid,{id:Date.now()+Math.random(),title,done:false,subtasks:[]})});
    return(<div style={{padding:16,overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <span style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Task Detail</span>
        <div style={{display:'flex',alignItems:'center',gap:2}}>
          <button onClick={()=>{setFocusTaskId(selectedTask.id);setShowFocus(true);}} className="quick-act"><Play size={12} style={{color:'var(--accent)'}}/></button>
          <button onClick={()=>updateTask(selectedTask.id,{priority:!selectedTask.priority})} className="quick-act"><Star size={12} style={{color:selectedTask.priority?'var(--amber)':'var(--text3)',fill:selectedTask.priority?'var(--amber)':'none'}}/></button>
          <button onClick={()=>deleteTask(selectedTask.id)} className="quick-act"><Trash2 size={12}/></button>
          <button onClick={()=>{setSelectedTaskId(null);setEditField(null);setShowTagPicker(false);}} className="quick-act"><X size={12}/></button>
        </div>
      </div>
      {projPath.length>0&&<div style={{display:'flex',alignItems:'center',gap:4,marginBottom:8,flexWrap:'wrap'}}>{projPath.map((p,i)=><React.Fragment key={p.id}>{i>0&&<ChevronRight size={9} style={{color:'var(--text3)'}}/>}<span style={{fontSize:10,fontWeight:600,color:p.color,background:hRgba(p.color,0.12),padding:'1px 6px',borderRadius:4}}>{p.title}</span></React.Fragment>)}</div>}
      {editField==='title'?<input autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{if(editValue.trim())updateTask(selectedTask.id,{title:editValue.trim()});setEditField(null);}} onKeyDown={e=>{if(e.key==='Enter'){if(editValue.trim())updateTask(selectedTask.id,{title:editValue.trim()});setEditField(null);}}} className="fm-input" style={{fontSize:15,fontWeight:800,marginBottom:12}}/>:<h2 onClick={()=>{setEditField('title');setEditValue(selectedTask.title);}} style={{fontSize:15,fontWeight:800,color:'var(--text)',marginBottom:10,cursor:'pointer',lineHeight:1.3}}>{selectedTask.title}</h2>}
      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:12}}>
        {en&&(()=>{const I=en.icon;return<span className={`badge ${en.bg} ${en.color}`}><I size={9}/>{en.label}</span>;})()}
        {selectedTask.timeEst&&<span className="badge" style={{background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}><Clock size={9}/>{selectedTask.timeEst}m</span>}
        {selectedTask.priority&&<span className="badge" style={{background:'rgba(201,160,67,0.12)',color:'var(--amber)'}}><Star size={9}/>Priority</span>}
        {selectedTask.dueDate&&<span className="badge" style={{background:selectedTask.dueDate<todayStr?'rgba(191,90,90,0.12)':'rgba(196,182,156,0.12)',color:selectedTask.dueDate<todayStr?'var(--rose)':'var(--accent)'}}><Calendar size={9}/>Due {selectedTask.dueDate}</span>}
        {selectedTask.startDate&&<span className="badge" style={{background:'rgba(111,172,142,0.12)',color:'var(--emerald)'}}><Calendar size={9}/>Start {selectedTask.startDate}</span>}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:4}}>Start Date</label><input type="date" value={selectedTask.startDate||''} onChange={e=>updateTask(selectedTask.id,{startDate:e.target.value||null})} className="fm-input" style={{fontSize:11,padding:'6px 8px'}}/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:4}}>Due Date</label><input type="date" value={selectedTask.dueDate||''} onChange={e=>updateTask(selectedTask.id,{dueDate:e.target.value||null})} className="fm-input" style={{fontSize:11,padding:'6px 8px'}}/></div>
        </div>
        <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:4}}>Notes</label>
          {editField==='notes'?<textarea autoFocus value={editValue} onChange={e=>{setEditValue(e.target.value);updateTask(selectedTask.id,{notes:e.target.value});}} onBlur={()=>setEditField(null)} className="fm-input" style={{resize:'none',minHeight:50,fontSize:12}}/>
            :<div onClick={()=>{setEditField('notes');setEditValue(selectedTask.notes||'');}} style={{background:'var(--surface3)',borderRadius:8,padding:'8px 10px',fontSize:12,color:selectedTask.notes?'var(--text2)':'var(--text3)',cursor:'pointer',minHeight:34,border:'1.5px solid var(--border)',fontStyle:selectedTask.notes?'normal':'italic'}}>{selectedTask.notes||'Add notes...'}</div>}
        </div>
        <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Status</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{['next','waiting','someday','done'].map(s=><button key={s} onClick={()=>updateTask(selectedTask.id,{status:s,completedAt:s==='done'?todayStr:null})} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'1.5px solid',background:selectedTask.status===s?'var(--accent)':'transparent',borderColor:selectedTask.status===s?'var(--accent)':'var(--border)',color:selectedTask.status===s?'#1a1a1a':'var(--text2)',textTransform:'capitalize'}}>{s==='someday'?'Someday':s}</button>)}</div></div>
        <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Project</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}><button onClick={()=>updateTask(selectedTask.id,{project:null})} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'1.5px solid',background:selectedTask.project===null?'var(--accent)':'transparent',borderColor:selectedTask.project===null?'var(--accent)':'var(--border)',color:selectedTask.project===null?'#1a1a1a':'var(--text2)'}}>None</button>{projects.map(p=><button key={p.id} onClick={()=>updateTask(selectedTask.id,{project:p.id})} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'1.5px solid',background:selectedTask.project===p.id?hRgba(p.color,0.2):'transparent',borderColor:selectedTask.project===p.id?p.color:'var(--border)',color:selectedTask.project===p.id?p.color:'var(--text2)'}}>{p.title}</button>)}</div></div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Tags</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>
            {tags.map(tg=>{const active=(selectedTask.tags||[]).includes(tg.id);return<button key={tg.id} onClick={()=>toggleTaskTag(selectedTask.id,tg.id)} style={{padding:'3px 9px',borderRadius:999,fontSize:10,fontWeight:700,cursor:'pointer',border:'1.5px solid',display:'flex',alignItems:'center',gap:3,background:active?hRgba(tg.hex,0.2):'transparent',borderColor:active?tg.hex:'var(--border)',color:active?tg.hex:'var(--text3)',transition:'all 0.15s'}}><Hash size={8}/>{tg.name}</button>;})}
            <button onClick={()=>setShowTagPicker(!showTagPicker)} style={{width:24,height:24,borderRadius:'50%',border:'1.5px dashed var(--border2)',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text3)'}}><Plus size={10}/></button>
          </div>
          <AnimatePresence>{showTagPicker&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden'}}>
            <div style={{padding:10,background:'var(--surface3)',borderRadius:8,border:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8}}>
              <input value={newTagName} onChange={e=>setNewTagName(e.target.value)} placeholder="New tag name..." className="fm-input" style={{fontSize:11,padding:'5px 8px'}} onKeyDown={e=>{if(e.key==='Enter'&&newTagName.trim()){const id=addTag(newTagName.trim(),newTagHex);toggleTaskTag(selectedTask.id,id);setNewTagName('');setShowTagPicker(false);}}}/>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{PROJ_COLORS.map(c=><button key={c} onClick={()=>setNewTagHex(c)} style={{width:16,height:16,borderRadius:'50%',background:c,border:'none',cursor:'pointer',boxShadow:newTagHex===c?`0 0 0 2px var(--bg),0 0 0 3px ${c}`:'none'}}/>)}</div>
              <button onClick={()=>{if(newTagName.trim()){const id=addTag(newTagName.trim(),newTagHex);toggleTaskTag(selectedTask.id,id);setNewTagName('');setShowTagPicker(false);}}} className="fm-btn fm-btn-primary" style={{fontSize:11,padding:'4px 10px',alignSelf:'flex-start'}}><Tag size={9}/>Create Tag</button>
            </div>
          </motion.div>}</AnimatePresence>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Subtasks ({stCount.d}/{stCount.t})</label>
          {stCount.t>0&&<div className="progress-bar" style={{marginBottom:8}}><div className="progress-fill" style={{width:`${stCount.t>0?(stCount.d/stCount.t)*100:0}%`,background:'linear-gradient(90deg,var(--emerald),#83bfa0)'}}/></div>}
          <div style={{background:'var(--surface3)',borderRadius:10,border:'1.5px solid var(--border)',padding:6,maxHeight:200,overflowY:'auto'}}>
            {selectedTask.subtasks.length===0&&<p style={{fontSize:11,color:'var(--text3)',textAlign:'center',padding:'10px 0',fontStyle:'italic'}}>No subtasks yet</p>}
            {selectedTask.subtasks.map(s=><SubtaskItem key={s.id} st={s} onToggle={handleStToggle} onDel={handleStDel} onAddChild={handleStAddChild} depth={0} maxD={4}/>)}
          </div>
          <div style={{display:'flex',gap:5,marginTop:6}}><input value={newSubInput} onChange={e=>setNewSubInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newSubInput.trim()){updateTask(selectedTask.id,{subtasks:[...selectedTask.subtasks,{id:Date.now()+Math.random(),title:newSubInput.trim(),done:false,subtasks:[]}]});setNewSubInput('');}}} placeholder="Add subtask..." className="fm-input" style={{flex:1,fontSize:11,padding:'5px 8px'}}/><button onClick={()=>{if(!newSubInput.trim())return;updateTask(selectedTask.id,{subtasks:[...selectedTask.subtasks,{id:Date.now()+Math.random(),title:newSubInput.trim(),done:false,subtasks:[]}]});setNewSubInput('');}} className="fm-btn fm-btn-ghost" style={{padding:'5px 8px'}}><Plus size={10}/></button></div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button onClick={()=>{setFocusTaskId(selectedTask.id);setShowFocus(true);}} className="fm-btn fm-btn-primary" style={{flex:1,justifyContent:'center',background:'linear-gradient(135deg,var(--accent),var(--violet))',color:'#1a1a1a'}}><Play size={11}/>Focus</button>
        <button onClick={()=>markDone(selectedTask.id)} className="fm-btn" style={{padding:'7px 12px',background:selectedTask.status==='done'?'rgba(111,172,142,0.12)':'var(--surface3)',color:selectedTask.status==='done'?'var(--emerald)':'var(--text2)',border:`1.5px solid ${selectedTask.status==='done'?'rgba(111,172,142,0.25)':'var(--border)'}`}}><CheckCircle size={11}/>{selectedTask.status==='done'?'Done':'Complete'}</button>
      </div>
    </div>);
  };

  const ProjectItem=({proj,depth=0})=>{const progress=getProjectProgress(proj.id);const children=getChildren(proj.id);const pts=tasks.filter(t=>t.project===proj.id);const isOpen=selectedProjId===proj.id;const path=getProjectPath(proj.id);
    return(<div className="fm-card" style={{overflow:'hidden',marginLeft:depth*16}}><div style={{padding:'12px 14px',cursor:'pointer',display:'flex',flexDirection:'column',gap:8}} onClick={()=>setSelectedProjId(isOpen?null:proj.id)}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:12,height:12,borderRadius:'50%',background:proj.color,flexShrink:0}}/><div style={{flex:1,minWidth:0}}>{depth>0&&<div style={{display:'flex',alignItems:'center',gap:3,marginBottom:2}}>{path.slice(0,-1).map((p,i)=><React.Fragment key={p.id}>{i>0&&<ChevronRight size={7} style={{color:'var(--text3)'}}/>}<span style={{fontSize:8,color:p.color,fontWeight:600}}>{p.title}</span></React.Fragment>)}</div>}<h3 style={{fontWeight:700,color:'var(--text)',fontSize:14}}>{proj.title}</h3>{proj.desc&&<p style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{proj.desc}</p>}</div><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{textAlign:'right'}}><span style={{fontSize:13,fontWeight:700,color:progress.pct===100?'var(--emerald)':'var(--text2)'}}>{progress.pct}%</span><p style={{fontSize:9,color:'var(--text3)'}}>{progress.done}/{progress.total}</p></div><button onClick={e=>{e.stopPropagation();setConfirmDeleteProj(proj.id);}} className="quick-act"><Trash2 size={13}/></button><motion.div animate={{rotate:isOpen?180:0}} transition={{duration:0.2}}><ChevronDown size={14} style={{color:'var(--text3)'}}/></motion.div></div></div><div className="progress-bar"><div className="progress-fill" style={{width:`${progress.pct}%`,background:progress.pct===100?'linear-gradient(90deg,var(--emerald),#83bfa0)':`linear-gradient(90deg,${proj.color},${hRgba(proj.color,0.6)})`}}/></div></div>
      <AnimatePresence>{isOpen&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}} style={{borderTop:'1px solid var(--border)',padding:'8px 10px',overflow:'hidden'}}>{pts.length===0&&children.length===0?<p style={{fontSize:11,color:'var(--text3)',textAlign:'center',padding:'16px 0',fontStyle:'italic'}}>No tasks assigned</p>:<div style={{display:'flex',flexDirection:'column',gap:4}}>{pts.map(t=><TaskRow key={t.id} task={t} showProject={false} selected={selectedTaskId===t.id} projects={projects} tags={tags} scheduledMap={scheduledMap} todayStr={todayStr} onMark={markDone} onSelect={selectTask} onMoveToTomorrow={moveToTomorrow} onSnooze={snoozeTask} onTouchStart={onTaskTouchStart}/>)}</div>}</motion.div>}</AnimatePresence>
      {children.length>0&&<div style={{padding:'0 4px 4px'}}>{children.map(c=><ProjectItem key={c.id} proj={c} depth={depth+1}/>)}</div>}
    </div>);
  };

  const openEventModal=useCallback((date=todayStr,start=540,end=600)=>{setSelDate(date);setDs(start);setDe(end);setEditEv(null);setModalOpen(true);},[todayStr]);

  const renderTodayView=()=>{
    const isDetOpen=selectedTaskId!==null&&!todayExpanded;
    const priorityTasks=todayTasks.filter(t=>t.priority).slice(0,3);
    const priorityTaskIds=new Set(priorityTasks.map(t=>t.id));
    const normalTasks=todayTasks.filter(t=>!t.priority||!priorityTaskIds.has(t.id));
    return(<div style={{display:'flex',flex:1,overflow:'hidden'}}>
      <AnimatePresence>{showTimeline&&!todayExpanded&&(
        <motion.div initial={{width:0,opacity:0}} animate={{width:260,opacity:1}} exit={{width:0,opacity:0}} transition={sprG} style={{display:'flex',flexDirection:'column',flexShrink:0,borderRight:'1px solid var(--border)',background:'var(--surface)',overflow:'hidden'}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
            <Calendar size={12} style={{color:'var(--accent)'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'var(--text2)'}}>{now.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</span>
            <span style={{fontSize:10,color:'var(--text3)',marginLeft:'auto'}}>{todayEvents.length}</span>
            <button onClick={()=>openEventModal(todayStr)} className="quick-act" title="Add event" style={{marginLeft:4}}><PlusCircle size={12}/></button>
          </div>
          <div ref={setTodaySEl} style={{flex:1,overflow:'auto'}}>
            <div style={{display:'flex',minHeight:HH*24}}>
              <div style={{width:36,flexShrink:0,position:'relative',borderRight:'1px solid var(--border)'}}>{HOURS.map(h=><div key={h} style={{position:'absolute',right:5,fontSize:9,fontWeight:500,color:'var(--text3)',fontFamily:'DM Mono,monospace',top:h*HH-6}}>{h===0?'':String(h).padStart(2,'0')}</div>)}</div>
              {renderCol(todayStr,todayEvents,true,true,true)}
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>
      <motion.div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}} animate={{flex:'1 1 auto'}} transition={sprG}>
        <div style={{flexShrink:0,padding:'12px 18px',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><div className="glow-dot"/><h1 style={{fontSize:17,fontWeight:800,color:'var(--text)'}}>Today's Focus</h1></div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              {!todayExpanded&&<button onClick={()=>setShowTimeline(!showTimeline)} className="quick-act" style={{padding:5}}><Calendar size={12}/></button>}
              <button onClick={()=>setTodayExpanded(!todayExpanded)} className="quick-act" style={{padding:5}}>{todayExpanded?<Minimize2 size={12}/>:<Maximize2 size={12}/>}</button>
              <div style={{display:'flex',alignItems:'center',gap:2,background:'var(--surface)',borderRadius:8,padding:'3px 4px',border:'1.5px solid var(--border)'}}>
                {ENERGY.map(l=>{const I=l.icon;return<button key={l.id} onClick={()=>setCurEnergy(l.id)} className={curEnergy===l.id?`${l.bg} ${l.color}`:''} style={{padding:'3px 7px',borderRadius:6,fontSize:10,fontWeight:600,display:'flex',alignItems:'center',gap:3,cursor:'pointer',border:'none',background:curEnergy===l.id?undefined:'transparent',color:curEnergy===l.id?undefined:'var(--text3)'}}><I size={9}/>{l.label}</button>;})}
              </div>
              <button onClick={()=>openEventModal(todayStr)} className="fm-btn fm-btn-ghost" style={{padding:'5px 10px',fontSize:11,display:'flex',alignItems:'center',gap:4}}><Calendar size={11}/> Event</button>
              <button onClick={()=>setShowCapture(true)} className="fm-btn fm-btn-primary" style={{padding:'5px 10px',fontSize:11}}><Plus size={11}/>Add</button>
            </div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{position:'relative',width:64,height:64,flexShrink:0}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={ringData} innerRadius={22} outerRadius={30} startAngle={90} endAngle={-270} dataKey="v" stroke="none" isAnimationActive={true}><Cell fill="var(--emerald)"/><Cell fill="rgba(196,182,156,0.10)"/></Pie></PieChart>
              </ResponsiveContainer>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>{todayPct}%</span></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,flex:1}}>
              {[{label:'Tasks',value:todayTasks.length,icon:Target,color:'var(--accent)',bg:'rgba(196,182,156,0.08)'},{label:'Done',value:todayDoneCount,icon:CheckCircle,color:'var(--emerald)',bg:'rgba(111,172,142,0.08)'},{label:'Overdue',value:overdueCount,icon:AlertCircle,color:'var(--rose)',bg:'rgba(191,90,90,0.08)'}].map(s=>{const SI=s.icon;return<div key={s.label} className="summary-card"><div style={{width:28,height:28,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SI size={12} style={{color:s.color}}/></div><div><p style={{fontSize:16,fontWeight:800,color:'var(--text)',lineHeight:1}}>{s.value}</p><p style={{fontSize:9,color:'var(--text3)',marginTop:1}}>{s.label}</p></div></div>;})}
            </div>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'12px 18px 16px'}}>
          {priorityTasks.length>0&&(<div style={{marginBottom:20}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}><Star size={14} style={{color:'var(--amber)',fill:'var(--amber)'}}/><h3 style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Priorities</h3><span style={{fontSize:10,color:'var(--text3)',marginLeft:4}}>({priorityTasks.length} of 3)</span></div><div style={{display:'flex',flexDirection:'column',gap:5}}><AnimatePresence>{priorityTasks.map(t=><TaskRow key={t.id} task={t} showQuickActions selected={selectedTaskId===t.id} projects={projects} tags={tags} scheduledMap={scheduledMap} todayStr={todayStr} onMark={markDone} onSelect={selectTask} onMoveToTomorrow={moveToTomorrow} onSnooze={snoozeTask} onTouchStart={onTaskTouchStart}/>)}</AnimatePresence></div></div>)}
          <div><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}><Target size={14} style={{color:'var(--accent)'}}/><h3 style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Task List</h3></div>
            {normalTasks.length===0?<div className="empty-state" style={{padding:'32px 24px'}}><div className="empty-icon"><CheckCircle size={24} style={{color:'var(--emerald)'}}/></div><p className="empty-title">All caught up!</p><p className="empty-sub">Press <kbd style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:4,padding:'1px 5px',fontSize:10,fontFamily:'DM Mono'}}>N</kbd> to capture</p></div>
              :<div style={{display:'flex',flexDirection:'column',gap:5}}><AnimatePresence>{normalTasks.map(t=><TaskRow key={t.id} task={t} showQuickActions selected={selectedTaskId===t.id} projects={projects} tags={tags} scheduledMap={scheduledMap} todayStr={todayStr} onMark={markDone} onSelect={selectTask} onMoveToTomorrow={moveToTomorrow} onSnooze={snoozeTask} onTouchStart={onTaskTouchStart}/>)}</AnimatePresence></div>}
          </div>
          {todayDoneCount>0&&<div style={{marginTop:20,padding:'10px 12px',background:'var(--surface)',borderRadius:12,border:'1.5px solid var(--border)'}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><CheckCircle size={12} style={{color:'var(--emerald)'}}/><span style={{fontSize:11,fontWeight:700,color:'var(--text2)'}}>Completed Today ({todayDoneCount})</span></div><div style={{display:'flex',flexDirection:'column',gap:3}}>{tasks.filter(t=>t.status==='done'&&t.completedAt===todayStr).slice(0,5).map(t=><div key={t.id} style={{fontSize:12,color:'var(--text3)',textDecoration:'line-through',padding:'2px 0'}}>{t.title}</div>)}</div></div>}
        </div>
      </motion.div>
      <AnimatePresence mode="wait">{isDetOpen&&selectedTask&&(
        <motion.div key={selectedTask.id} initial={{opacity:0,x:50,flex:'0 0 0px'}} animate={{opacity:1,x:0,flex:'0 0 300px'}} exit={{opacity:0,x:50,flex:'0 0 0px'}} transition={sprG} style={{height:'100%',background:'var(--surface)',overflow:'hidden',borderLeft:'1px solid var(--border)'}}>{renderDetail()}</motion.div>
      )}</AnimatePresence>
    </div>);
  };

  const renderInboxView=()=>(<div><div className="section-header"><Inbox size={18} style={{color:'var(--accent)'}}/><h2>Inbox</h2>{inboxTasks.length>0&&<span className="section-count">{inboxTasks.length}</span>}</div>{inboxTasks.length===0?<div className="empty-state"><div className="empty-icon"><CheckCircle size={24} style={{color:'var(--emerald)'}}/></div><p className="empty-title">Inbox Zero! 🎉</p></div>:<div style={{display:'flex',flexDirection:'column',gap:7}}><AnimatePresence>{inboxTasks.map(task=>(<motion.div key={task.id} layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-20}} transition={spr} className="fm-card" style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:8,borderRadius:'50%',background:'var(--amber)',flexShrink:0}}/><div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{task.title}</p><p style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{task.createdAt}</p></div><button onClick={()=>{setProcTaskId(task.id);setProcStep(0);}} className="fm-btn fm-btn-primary" style={{padding:'5px 10px',fontSize:11}}><Brain size={10}/>Process</button><button onClick={()=>deleteTask(task.id)} className="quick-act"><Trash2 size={13}/></button></motion.div>))}</AnimatePresence></div>}</div>);

  const renderNextView=()=>{const filtered=ctxFilter==='all'?nextTasks:nextTasks.filter(t=>t.context===ctxFilter);return(<div><div className="section-header"><Zap size={18} style={{color:'var(--amber)'}}/><h2>Next Actions</h2>{nextTasks.length>0&&<span className="section-count">{nextTasks.length}</span>}</div><div style={{display:'flex',gap:5,marginBottom:14,flexWrap:'wrap'}}><button onClick={()=>setCtxFilter('all')} className={`pill-tab ${ctxFilter==='all'?'active':''}`}>All</button>{CONTEXTS.map(ctx=>{const I=ctx.icon;return<button key={ctx.id} onClick={()=>setCtxFilter(ctx.id)} className={`pill-tab ${ctxFilter===ctx.id?'active':''}`} style={{display:'flex',alignItems:'center',gap:4}}><I size={10}/>{ctx.label}</button>;})}</div>{filtered.length===0?<div className="empty-state"><div className="empty-icon"><Zap size={24} style={{color:'var(--amber)'}}/></div><p className="empty-title">No actions</p></div>:<div style={{display:'flex',flexDirection:'column',gap:5}}><AnimatePresence>{filtered.map(t=><TaskRow key={t.id} task={t} selected={selectedTaskId===t.id} projects={projects} tags={tags} scheduledMap={scheduledMap} todayStr={todayStr} onMark={markDone} onSelect={selectTask} onMoveToTomorrow={moveToTomorrow} onSnooze={snoozeTask} onTouchStart={onTaskTouchStart}/>)}</AnimatePresence></div>}</div>);};

  const renderProjectsView=()=>(<div><div className="section-header" style={{justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:8}}><Folder size={18} style={{color:'var(--violet)'}}/><h2>Projects</h2></div><button onClick={()=>setShowNewProj(!showNewProj)} className="fm-btn fm-btn-primary" style={{padding:'6px 12px',fontSize:11}}><Plus size={11}/>New</button></div>
    <AnimatePresence>{showNewProj&&(<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden',marginBottom:16}}><div className="fm-card" style={{padding:16,display:'flex',flexDirection:'column',gap:10}}><input value={newProjTitle} onChange={e=>setNewProjTitle(e.target.value)} placeholder="Project name..." className="fm-input" autoFocus onKeyDown={e=>{if(e.key==='Enter')addProject();}}/><input value={newProjDesc} onChange={e=>setNewProjDesc(e.target.value)} placeholder="Description..." className="fm-input" style={{fontSize:12}}/><div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:7}}>Parent</label><div style={{display:'flex',gap:5,flexWrap:'wrap'}}><button onClick={()=>setNewProjParent(null)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid',background:newProjParent===null?'var(--accent)':'transparent',borderColor:newProjParent===null?'var(--accent)':'var(--border)',color:newProjParent===null?'#1a1a1a':'var(--text2)'}}>None</button>{projects.map(p=><button key={p.id} onClick={()=>setNewProjParent(p.id)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid',background:newProjParent===p.id?hRgba(p.color,0.15):'transparent',borderColor:newProjParent===p.id?p.color:'var(--border)',color:newProjParent===p.id?p.color:'var(--text2)'}}>{p.title}</button>)}</div></div><div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:7}}>Color</label><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{PROJ_COLORS.map(c=><button key={c} onClick={()=>setNewProjColor(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:'none',cursor:'pointer',boxShadow:newProjColor===c?`0 0 0 2px var(--bg),0 0 0 4px ${c}`:'none',transform:newProjColor===c?'scale(1.25)':'scale(1)',transition:'all 0.2s'}}/>)}</div></div><div style={{display:'flex',gap:8}}><button onClick={addProject} className="fm-btn fm-btn-primary" style={{padding:'7px 16px'}}>Create</button><button onClick={()=>setShowNewProj(false)} className="fm-btn fm-btn-ghost">Cancel</button></div></div></motion.div>)}</AnimatePresence>
    {projects.length===0&&!showNewProj&&<div className="empty-state"><div className="empty-icon"><Folder size={24} style={{color:'var(--violet)'}}/></div><p className="empty-title">No projects yet</p></div>}
    <div style={{display:'flex',flexDirection:'column',gap:10}}>{rootProjects.map(p=><ProjectItem key={p.id} proj={p}/>)}</div>
  </div>);

  const renderWaitingView=()=>(<div><div className="section-header"><Clock size={18} style={{color:'var(--violet)'}}/><h2>Waiting For</h2>{waitingTasks.length>0&&<span className="section-count">{waitingTasks.length}</span>}</div>{waitingTasks.length===0?<div className="empty-state"><div className="empty-icon"><Clock size={24} style={{color:'var(--violet)'}}/></div><p className="empty-title">Nothing pending</p></div>:<div style={{display:'flex',flexDirection:'column',gap:5}}>{waitingTasks.map(t=><TaskRow key={t.id} task={t} selected={selectedTaskId===t.id} projects={projects} tags={tags} scheduledMap={scheduledMap} todayStr={todayStr} onMark={markDone} onSelect={selectTask} onMoveToTomorrow={moveToTomorrow} onSnooze={snoozeTask} onTouchStart={onTaskTouchStart}/>)}</div>}</div>);
  const renderSomedayView=()=>(<div><div className="section-header"><Lightbulb size={18} style={{color:'var(--amber)'}}/><h2>Someday / Maybe</h2></div>{somedayTasks.length===0?<div className="empty-state"><div className="empty-icon"><Lightbulb size={24} style={{color:'var(--amber)'}}/></div><p className="empty-title">No ideas yet</p></div>:<div className="fm-card" style={{overflow:'hidden'}}>{somedayTasks.map((task,i)=>(<div key={task.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderBottom:i<somedayTasks.length-1?'1px solid var(--border)':'none',cursor:'pointer'}} onClick={()=>selectTask(task.id)}><Lightbulb size={13} style={{color:'var(--amber)',flexShrink:0}}/><div style={{flex:1}}><p style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{task.title}</p></div><button onClick={e=>{e.stopPropagation();updateTask(task.id,{status:'next',context:suggestCtx(task.title),energy:suggestEn(task.title),timeEst:30});addToast('Activated!');}} className="fm-btn fm-btn-ghost" style={{padding:'4px 10px',fontSize:11}}><ArrowRight size={9}/>Activate</button></div>))}</div>}</div>);

  const renderReviewView=()=>{const doneChk=reviewChecks.filter(Boolean).length;const totalT=tasks.length;const doneC=doneTasks.length;const prodScore=totalT>0?Math.round((doneC/totalT)*100):0;const estMin=nextTasks.reduce((s,t)=>s+(t.timeEst||0),0);const estHrs=Math.round(estMin/60*10)/10;const stepCounts={inbox:inboxTasks.length,projects:projects.length,waiting:waitingTasks.length,someday:somedayTasks.length,plan:nextTasks.length};
    return(<div><div className="section-header"><RefreshCw size={18} style={{color:'var(--accent)'}}/><h2>Weekly Review</h2></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>{[{label:'Completion',value:`${prodScore}%`,sub:`${doneC}/${totalT}`,gradient:'linear-gradient(135deg,#7d8a9a,#9aabb8)',icon:TrendingUp},{label:'Inbox',value:inboxTasks.length,sub:inboxTasks.length===0?'Clear':'Process',gradient:'linear-gradient(135deg,#b09245,#c4a85a)',icon:Inbox},{label:'Actions',value:nextTasks.length,sub:`~${estHrs}h`,gradient:'linear-gradient(135deg,#6b9a7e,#83bfa0)',icon:Zap},{label:'Review',value:`${doneChk}/5`,sub:doneChk===5?'Done!':'In progress',gradient:'linear-gradient(135deg,#8f849c,#b0a89e)',icon:RefreshCw}].map((card,i)=>{const CI=card.icon;return<div key={i} style={{borderRadius:14,padding:14,background:card.gradient,color:'#fff',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',right:-8,top:-8,opacity:0.15}}><CI size={56}/></div><p style={{fontSize:9,fontWeight:700,opacity:0.8,textTransform:'uppercase'}}>{card.label}</p><p style={{fontSize:22,fontWeight:800,marginTop:4,lineHeight:1}}>{card.value}</p><p style={{fontSize:10,opacity:0.75,marginTop:3}}>{card.sub}</p></div>;})}</div>
      <div className="fm-card" style={{overflow:'hidden'}}><div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}><div className="progress-bar" style={{flex:1}}><div className="progress-fill" style={{width:`${(doneChk/5)*100}%`}}/></div><span style={{fontSize:11,fontWeight:700,color:'var(--text2)'}}>{doneChk}/5</span></div>
        {REVIEW_STEPS.map((step,i)=>{const SI=step.icon;const cnt=stepCounts[step.key];return(<div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:14,borderBottom:i<4?'1px solid var(--border)':'none',cursor:'pointer',background:reviewStep===i?'rgba(196,182,156,0.04)':'transparent'}} onClick={()=>setReviewStep(i)}><button onClick={e=>{e.stopPropagation();setReviewChecks(p=>{const n=[...p];n[i]=!n[i];return n;});}} style={{cursor:'pointer',border:'none',background:'transparent',padding:0,flexShrink:0}}>{reviewChecks[i]?<div style={{width:22,height:22,borderRadius:'50%',background:'var(--emerald)',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={11} style={{color:'#fff'}}/></div>:<div style={{width:22,height:22,borderRadius:'50%',border:'2px solid var(--text3)'}}/>}</button><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:6}}><SI size={13} style={{color:'var(--accent)'}}/><h3 style={{fontSize:13,fontWeight:700,color:reviewChecks[i]?'var(--text3)':'var(--text)',textDecoration:reviewChecks[i]?'line-through':'none'}}>{step.title}</h3>{cnt>0&&<span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)',fontWeight:700}}>{cnt}</span>}</div><p style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{step.desc}</p></div><button onClick={e=>{e.stopPropagation();setView(step.key==='plan'?'calendar':step.key==='projects'?'projects':step.key);}} className="quick-act"><ArrowRight size={10}/></button></div>);})}
      </div>
    </div>);
  };

  const renderCalendarView=()=>(<div style={{height:'100%',display:'flex',flexDirection:'column'}}>
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 2px 12px',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:2}}>{[[-1,ChevronLeft],[1,ChevronRight]].map(([d,Icon])=><button key={d} onClick={()=>nav(d)} className="quick-act" style={{padding:7}}><Icon size={14}/></button>)}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:6}}><h1 style={{fontSize:17,fontWeight:800,color:'var(--text)'}}>{MONTHS[cd.month]}</h1><span style={{fontSize:13,color:'var(--text3)'}}>{cd.year}</span></div>
      <button onClick={goToday} className="fm-btn fm-btn-ghost" style={{padding:'4px 10px',fontSize:11}}>Today</button>
      <button onClick={()=>openEventModal(fmtD(cd.year,cd.month,cd.day))} className="fm-btn fm-btn-primary" style={{padding:'4px 12px',fontSize:11}}><PlusCircle size={12}/> Add Event</button>
      <div style={{flex:1}}/>
      <div style={{display:'flex',background:'var(--surface)',borderRadius:8,padding:3,border:'1.5px solid var(--border)',gap:2}}>{['week','month'].map(v=><button key={v} onClick={()=>setCalView(v)} style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',border:'none',background:calView===v?'var(--surface3)':'transparent',color:calView===v?'var(--text)':'var(--text3)'}}>{v==='week'?'Week':'Month'}</button>)}</div>
    </div>
    {calView==='week'&&<div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0}}><div style={{width:44,flexShrink:0,borderRight:'1px solid var(--border)'}}/>{weekDays.map(d=><div key={d.dateStr} style={{flex:1,padding:'8px 4px',textAlign:'center',borderRight:'1px solid var(--border)',background:d.isToday?'rgba(196,182,156,0.03)':'transparent',cursor:'pointer'}} onClick={()=>setCd({year:d.date.getFullYear(),month:d.date.getMonth(),day:d.date.getDate()})}><div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',fontWeight:600}}>{d.dayName}</div><div style={{fontSize:16,fontWeight:700,margin:'2px auto 0',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',background:d.isToday?'var(--accent)':'transparent',color:d.isToday?'#1a1a1a':'var(--text2)'}}>{d.dayNum}</div></div>)}</div>
      <div ref={setSEl} style={{flex:1,overflow:'auto'}}><div style={{display:'flex',minHeight:HH*24}}><div style={{width:44,flexShrink:0,position:'relative',borderRight:'1px solid var(--border)'}}>{HOURS.map(h=><div key={h} style={{position:'absolute',right:6,fontSize:9,fontWeight:500,color:'var(--text3)',fontFamily:'DM Mono,monospace',top:h*HH-6}}>{h===0?'':String(h).padStart(2,'0')+':00'}</div>)}</div>{weekDays.map(d=>renderCol(d.dateStr,filteredEvents.filter(e=>e.date===d.dateStr),d.isToday,false,true))}</div></div>
    </div>}
    {calView==='month'&&<div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>{DAYS_MON.map(d=><div key={d} style={{textAlign:'center',padding:'4px 0',fontSize:10,fontWeight:600,color:'var(--text3)',textTransform:'uppercase'}}>{d.slice(0,3)}</div>)}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',flex:1,gap:3,overflow:'hidden'}}>{calCells.map((cell,i)=>{const dstr=fmtD(cell.year,cell.month,cell.day);const dayEvs=filteredEvents.filter(e=>e.date===dstr).sort((a,b)=>a.startMin-b.startMin);const isT=dstr===todayStr;return<div key={i} onClick={()=>{setCd({year:cell.year,month:cell.month,day:cell.day});setCalView('week');}} style={{borderRadius:10,padding:'5px 6px',cursor:'pointer',overflow:'hidden',background:'var(--surface)',border:`1.5px solid ${isT?'rgba(196,182,156,0.2)':'var(--border)'}`}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:11,fontWeight:isT?700:600,background:isT?'var(--accent)':'transparent',color:isT?'#1a1a1a':cell.current?'var(--text)':'var(--text3)',borderRadius:4,padding:isT?'1px 5px':0}}>{cell.day}</span>{dayEvs.length>0&&<span style={{fontSize:8,color:'var(--text3)'}}>{dayEvs.length}</span>}</div>{dayEvs.slice(0,2).map((ev,idx)=><div key={idx} style={{padding:'1px 4px',borderRadius:3,color:'#fff',fontWeight:600,fontSize:8,marginBottom:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',background:getCat(ev.category).hex}}>{ev.title}</div>)}{dayEvs.length>2&&<div style={{fontSize:8,color:'var(--text3)',paddingLeft:2}}>+{dayEvs.length-2}</div>}</div>;})}</div>
    </div>}
  </div>);

  const viewRenderers={inbox:renderInboxView,next:renderNextView,projects:renderProjectsView,waiting:renderWaitingView,someday:renderSomedayView,review:renderReviewView};

  return(<>
    <style>{CSS}</style>
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',overflow:'hidden',fontFamily:'DM Sans,system-ui,sans-serif'}}>
      <AnimatePresence>{!sideCollapsed&&(
        <motion.aside initial={{width:0,opacity:0}} animate={{width:210,opacity:1}} exit={{width:0,opacity:0}} transition={sprG} style={{background:'var(--surface)',display:'flex',flexDirection:'column',flexShrink:0,zIndex:40,overflow:'hidden',borderRight:'1px solid var(--border)'}}>
          <div style={{padding:'12px 10px 8px',display:'flex',alignItems:'center',gap:8}}><div style={{width:30,height:30,borderRadius:10,background:'linear-gradient(135deg,var(--accent),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(196,182,156,0.2)'}}><Target size={14} style={{color:'#1a1a1a'}}/></div><span style={{color:'var(--text)',fontWeight:800,fontSize:15,whiteSpace:'nowrap'}}>FlowMind</span><button onClick={()=>setSideCollapsed(true)} style={{marginLeft:'auto',padding:4,cursor:'pointer',border:'none',background:'transparent',borderRadius:6,color:'var(--text3)'}}><PanelLeftClose size={13}/></button></div>
          <div style={{padding:'0 6px',flex:1,overflowY:'auto',marginTop:2}}>{NAV_VIEWS.map(n=>{const NI=n.icon;const active=view===n.id;const badge=n.id==='inbox'?inboxTasks.length:n.id==='waiting'?waitingTasks.length:null;return<button key={n.id} onClick={()=>{setView(n.id);if(n.id!=='today')setSelectedTaskId(null);}} className={`nav-item ${active?'active':''}`}><NI size={14} style={{flexShrink:0}}/><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.label}</span>{badge>0&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:999,fontWeight:700,flexShrink:0,background:active?'rgba(196,182,156,0.15)':'var(--surface3)',color:active?'var(--accent)':'var(--text3)',border:'1px solid var(--border)'}}>{badge}</span>}</button>;})}</div>
          {tags.length>0&&<div style={{padding:'6px 10px',borderTop:'1px solid var(--border)'}}><p style={{fontSize:9,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:4,padding:'0 4px'}}>Tags</p><div style={{display:'flex',flexWrap:'wrap',gap:3,padding:'0 4px'}}>{tags.map(tg=><span key={tg.id} style={{display:'inline-flex',alignItems:'center',gap:2,padding:'1px 6px',borderRadius:999,fontSize:9,fontWeight:600,background:hRgba(tg.hex,0.12),color:tg.hex,cursor:'pointer'}} onClick={()=>deleteTag(tg.id)}><Hash size={7}/>{tg.name}</span>)}</div></div>}
          <div style={{padding:'8px 10px',borderTop:'1px solid var(--border)'}}><div style={{display:'flex',alignItems:'center',gap:8,padding:4}}><div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,var(--amber),#c4854a)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:11,fontWeight:700,color:'#fff'}}>U</div><div><p style={{fontSize:12,color:'var(--text)',fontWeight:600}}>User</p><p style={{fontSize:10,color:'var(--text3)'}}>Personal</p></div></div></div>
        </motion.aside>
      )}</AnimatePresence>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{height:44,flexShrink:0,borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',padding:'0 12px',gap:8}}>
          <button onClick={()=>setSideCollapsed(!sideCollapsed)} className="quick-act" style={{padding:6}}><Menu size={15}/></button>
          <div style={{width:1,height:18,background:'var(--border)'}}/>
          <div style={{display:'flex',alignItems:'center',gap:6}}>{(()=>{const v=NAV_VIEWS.find(n=>n.id===view);if(!v)return null;const Icon=v.icon;return<Icon size={13} style={{color:'var(--accent)'}}/>;})()}<span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{NAV_VIEWS.find(n=>n.id===view)?.label||view}</span></div>
          <div style={{flex:1,maxWidth:280,position:'relative',marginLeft:16}}>
            <Search size={12} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}}/>
            <input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Search tasks..." className="fm-input" style={{fontSize:12,padding:'5px 10px 5px 30px',background:'var(--surface3)'}}/>
            {globalSearch&&<button onClick={()=>setGlobalSearch('')} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',border:'none',background:'transparent',cursor:'pointer',color:'var(--text3)',padding:2}}><X size={10}/></button>}
            {searchResults.length>0&&<div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:60,background:'var(--surface2)',border:'1.5px solid var(--border2)',borderRadius:10,boxShadow:'0 12px 32px rgba(0,0,0,0.5)',maxHeight:320,overflowY:'auto'}}>
              {searchResults.map(t=><div key={t.id} onClick={()=>{selectTask(t.id);setGlobalSearch('');const statusToView={inbox:'inbox',next:'next',waiting:'waiting',someday:'someday',done:'next'};setView(statusToView[t.status]||'today');}} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8,transition:'background 0.1s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface3)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div className={`check-btn ${t.status==='done'?'done':''}`} style={{width:12,height:12,borderWidth:1.5}}>{t.status==='done'&&<Check size={6} style={{color:'#fff'}}/>}</div>
                <div style={{flex:1,minWidth:0}}><p style={{fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</p><p style={{fontSize:10,color:'var(--text3)',textTransform:'capitalize'}}>{t.status}</p></div>
              </div>)}
            </div>}
          </div>
          <div style={{flex:1}}/>
          <button onClick={()=>setShowCapture(true)} className="fm-btn fm-btn-primary" style={{padding:'6px 12px',fontSize:12}}><Plus size={12}/>Capture <kbd style={{marginLeft:4,opacity:0.7,fontSize:9,background:'rgba(0,0,0,0.2)',borderRadius:3,padding:'1px 4px'}}>N</kbd></button>
        </div>

        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          {view==='today'?renderTodayView():view==='calendar'?(
            <div style={{display:'flex',flex:1,overflow:'hidden'}}><div style={{flex:1,overflow:'hidden',padding:16,display:'flex',flexDirection:'column'}}>{renderCalendarView()}</div><AnimatePresence>{selectedTask&&<motion.div initial={{width:0,opacity:0}} animate={{width:280,opacity:1}} exit={{width:0,opacity:0}} transition={sprG} style={{flexShrink:0,overflow:'hidden',background:'var(--surface)',borderLeft:'1px solid var(--border)'}}><div style={{width:280,height:'100%'}}>{renderDetail()}</div></motion.div>}</AnimatePresence><aside style={{display:'flex',flexDirection:'column',width:200,flexShrink:0,borderLeft:'1px solid var(--border)',overflowY:'auto',background:'var(--surface)'}}><div style={{padding:'12px 12px 8px'}}><MiniCal cd={cd} events={filteredEvents} onSelect={(y,m,d)=>{setCd({year:y,month:m,day:d});setSelDate(fmtD(y,m,d));}} sq={sq} setSq={setSq}/></div></aside></div>
          ):(<div style={{display:'flex',flex:1,overflow:'hidden'}}><div style={{flex:1,overflowY:'auto'}}><div style={{maxWidth:680,margin:'0 auto',padding:'20px 20px 80px'}}><AnimatePresence mode="wait"><motion.div key={view} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}>{viewRenderers[view]?.()}</motion.div></AnimatePresence></div></div><AnimatePresence>{selectedTask&&<motion.div initial={{width:0,opacity:0}} animate={{width:290,opacity:1}} exit={{width:0,opacity:0}} transition={sprG} style={{flexShrink:0,overflow:'hidden',background:'var(--surface)',borderLeft:'1px solid var(--border)'}}><div style={{width:290,height:'100%'}}>{renderDetail()}</div></motion.div>}</AnimatePresence></div>)}
        </div>
      </div>

      <AnimatePresence>{touchDragTask&&(<motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}} className="touch-ghost" style={{left:touchDragTask.x,top:touchDragTask.y}}><Calendar size={11}/>{touchDragTask.title}</motion.div>)}</AnimatePresence>

      <AnimatePresence>{showCapture&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-overlay" style={{alignItems:'flex-start',paddingTop:'15vh'}} onClick={()=>setShowCapture(false)}><motion.div initial={{y:-16,opacity:0,scale:0.96}} animate={{y:0,opacity:1,scale:1}} exit={{y:-16,opacity:0,scale:0.96}} transition={spr} className="modal-box" onClick={e=>e.stopPropagation()}><div style={{padding:'16px 18px'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><div style={{width:28,height:28,borderRadius:8,background:'var(--accent-dim)',display:'flex',alignItems:'center',justifyContent:'center'}}><Brain size={13} style={{color:'var(--accent)'}}/></div><h3 style={{fontSize:15,fontWeight:800,color:'var(--text)'}}>Quick Capture</h3><span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)',background:'var(--surface3)',padding:'2px 6px',borderRadius:4,fontFamily:'DM Mono'}}>ESC</span></div><input ref={captureRef} value={captureInput} onChange={e=>setCaptureInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleCapture();if(e.key==='Escape')setShowCapture(false);}} placeholder="What's on your mind?..." className="fm-input" style={{fontSize:15,padding:'12px 14px'}}/><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12}}><p style={{fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:5}}><Inbox size={10}/>Goes to Inbox</p><button onClick={handleCapture} className="fm-btn fm-btn-primary" style={{padding:'8px 16px'}}><Send size={11}/>Capture</button></div></div></motion.div></motion.div>)}</AnimatePresence>

      <AnimatePresence>{procTaskId&&(()=>{const pt=tasks.find(t=>t.id===procTaskId);if(!pt)return null;return(
        <motion.div key="proc" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-overlay" onClick={()=>{setProcTaskId(null);setProcStep(0);}}>
          <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} transition={spr} className="modal-box" onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Brain size={14} style={{color:'var(--accent)'}}/><h3 style={{fontSize:15,fontWeight:800,color:'var(--text)'}}>Process Task</h3><button onClick={()=>{setProcTaskId(null);setProcStep(0);}} style={{marginLeft:'auto',padding:4,cursor:'pointer',border:'none',background:'transparent',color:'var(--text3)',borderRadius:6}}><X size={15}/></button></div>
              <div style={{background:'var(--surface3)',borderRadius:10,padding:'8px 12px',marginBottom:12,border:'1.5px solid var(--border)'}}><p style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{pt.title}</p></div>
              <AnimatePresence mode="wait">
                {procStep===0&&<motion.div key="s0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:6}}>
                  <p style={{fontSize:11,color:'var(--text3)',fontWeight:700,marginBottom:2}}>Is this actionable?</p>
                  {[{a:'next',icon:Zap,color:'var(--accent)',bg:'rgba(196,182,156,0.10)',t:'Next Action',d:"I'll do this"},{a:'waiting',icon:User,color:'var(--violet)',bg:'rgba(154,148,144,0.10)',t:'Delegate',d:'Someone else'},{a:'someday',icon:Lightbulb,color:'var(--amber)',bg:'rgba(201,160,67,0.10)',t:'Someday',d:'Backlog it'},{a:'delete',icon:Trash2,color:'var(--rose)',bg:'rgba(191,90,90,0.10)',t:'Delete',d:'Not needed'}].map(o=>{const OI=o.icon;return<button key={o.a} onClick={()=>handleProcess(procTaskId,o.a)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'1.5px solid var(--border)',cursor:'pointer',textAlign:'left',background:'transparent',transition:'all 0.15s'}}><div style={{width:30,height:30,borderRadius:9,background:o.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><OI size={13} style={{color:o.color}}/></div><div><p style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{o.t}</p><p style={{fontSize:11,color:'var(--text3)'}}>{o.d}</p></div><ArrowRight size={12} style={{color:'var(--text3)',marginLeft:'auto'}}/></button>;})}
                </motion.div>}
                {procStep===1&&<motion.div key="s1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Context</label><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{CONTEXTS.map(ctx=>{const CI=ctx.icon;return<button key={ctx.id} onClick={()=>setProcCtx(ctx.id)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid',display:'flex',alignItems:'center',gap:4,background:procCtx===ctx.id?hRgba(ctx.color,0.15):'transparent',borderColor:procCtx===ctx.id?ctx.color:'var(--border)',color:procCtx===ctx.id?ctx.color:'var(--text2)'}}><CI size={10}/>{ctx.label}</button>;})}</div></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Energy</label><div style={{display:'flex',gap:5}}>{ENERGY.map(l=>{const LI=l.icon;return<button key={l.id} onClick={()=>setProcEnergy(l.id)} style={{padding:'5px 12px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'1.5px solid var(--border)',display:'flex',alignItems:'center',gap:4,background:procEnergy===l.id?hRgba(l.fill,0.15):'transparent',color:procEnergy===l.id?l.fill:'var(--text2)'}}><LI size={10}/>{l.label}</button>;})}</div></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Time</label><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{TIME_EST.map(m=><button key={m} onClick={()=>setProcTime(m)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid',background:procTime===m?'var(--accent)':'transparent',borderColor:procTime===m?'var(--accent)':'var(--border)',color:procTime===m?'#1a1a1a':'var(--text2)'}}>{m}m</button>)}</div></div>
                  {projects.length>0&&<div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:6}}>Project</label><div style={{display:'flex',flexWrap:'wrap',gap:5}}><button onClick={()=>setProcProject(null)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid',background:procProject===null?'var(--accent)':'transparent',borderColor:procProject===null?'var(--accent)':'var(--border)',color:procProject===null?'#1a1a1a':'var(--text2)'}}>None</button>{projects.map(p=><button key={p.id} onClick={()=>setProcProject(p.id)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid',background:procProject===p.id?hRgba(p.color,0.15):'transparent',borderColor:procProject===p.id?p.color:'var(--border)',color:procProject===p.id?p.color:'var(--text2)'}}>{p.title}</button>)}</div></div>}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:4}}>Start</label><input type="date" value={procStartDate} onChange={e=>setProcStartDate(e.target.value)} className="fm-input" style={{fontSize:11,padding:'6px 8px'}}/></div><div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:4}}>Due</label><input type="date" value={procDueDate} onChange={e=>setProcDueDate(e.target.value)} className="fm-input" style={{fontSize:11,padding:'6px 8px'}}/></div></div>
                  <div style={{display:'flex',gap:8,marginTop:4}}><button onClick={()=>setProcStep(0)} className="fm-btn fm-btn-ghost">← Back</button><button onClick={()=>handleProcess(procTaskId,'confirm-next')} className="fm-btn fm-btn-primary" style={{flex:1,justifyContent:'center'}}><Check size={12}/>Save</button></div>
                </motion.div>}
                {procStep===3&&<motion.div key="s3" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:10}}>
                  <p style={{fontSize:12,color:'var(--text3)',fontWeight:700}}>Delegate to:</p>
                  <input autoFocus value={delegateValue} onChange={e=>setDelegateValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleProcess(procTaskId,'confirm-waiting');}} placeholder="Person or team..." className="fm-input"/>
                  <div><label style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',display:'block',marginBottom:4}}>Follow-up Date</label><input type="date" value={procDueDate} onChange={e=>setProcDueDate(e.target.value)} className="fm-input" style={{fontSize:11,padding:'6px 8px'}}/></div>
                  <div style={{display:'flex',gap:8}}><button onClick={()=>setProcStep(0)} className="fm-btn fm-btn-ghost">← Back</button><button onClick={()=>handleProcess(procTaskId,'confirm-waiting')} className="fm-btn fm-btn-primary" style={{flex:1,justifyContent:'center',background:'linear-gradient(135deg,var(--violet),#7a7570)',color:'#fff'}}><Check size={12}/>Delegate</button></div>
                </motion.div>}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>);})()}</AnimatePresence>

      <AnimatePresence>{confirmDeleteProj!==null&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-overlay" onClick={()=>setConfirmDeleteProj(null)}><motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} transition={spr} className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}><div style={{padding:20}}><div style={{width:48,height:48,borderRadius:14,background:'rgba(191,90,90,0.10)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}><Trash2 size={20} style={{color:'var(--rose)'}}/></div><h3 style={{fontSize:16,fontWeight:800,color:'var(--text)',textAlign:'center',marginBottom:6}}>Delete Project?</h3><p style={{fontSize:12,color:'var(--text3)',textAlign:'center'}}>Tasks unlinked. Child projects also removed.</p><div style={{display:'flex',gap:8,marginTop:18}}><button onClick={()=>setConfirmDeleteProj(null)} className="fm-btn fm-btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancel</button><button onClick={()=>deleteProjectRecursive(confirmDeleteProj)} className="fm-btn fm-btn-danger" style={{flex:1,justifyContent:'center'}}><Trash2 size={12}/>Delete</button></div></div></motion.div></motion.div>)}</AnimatePresence>

      <AnimatePresence>{showFocus&&(()=>{const ft=tasks.find(t=>t.id===focusTaskId);if(!ft)return null;return(
        <motion.div key="focus" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32}}>
          <button onClick={()=>{setShowFocus(false);setPomRun(false);}} style={{position:'absolute',top:20,right:20,display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,cursor:'pointer',border:'1.5px solid var(--border)',background:'transparent',color:'var(--text2)',fontSize:11,fontWeight:600}}><Minimize2 size={12}/>Exit</button>
          <div style={{textAlign:'center',maxWidth:440}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>Focusing on</div>
            <h1 style={{fontSize:28,fontWeight:800,color:'var(--text)',marginBottom:32,lineHeight:1.2}}>{ft.title}</h1>
            <div className="mono" style={{fontSize:64,fontWeight:500,color:'var(--text)',marginBottom:20}}>{fmtTimer(pomSec)}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:14}}>
              <button onClick={()=>setPomRun(!pomRun)} style={{width:52,height:52,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',background:pomRun?'var(--surface3)':'var(--accent)',color:pomRun?'var(--text)':'#1a1a1a',boxShadow:pomRun?'none':'0 8px 24px rgba(196,182,156,0.25)'}}>{pomRun?<Pause size={20}/>:<Play size={20}/>}</button>
              <button onClick={()=>{setPomRun(false);setPomSec(pomMode==='work'?1500:300);}} style={{width:42,height:42,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid var(--border)',cursor:'pointer',background:'transparent',color:'var(--text2)'}}><RotateCcw size={15}/></button>
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:7,marginBottom:32}}>{[{m:'work',l:'Focus 25m'},{m:'break',l:'Break 5m'}].map(o=><button key={o.m} onClick={()=>{setPomMode(o.m);setPomRun(false);setPomSec(o.m==='work'?1500:300);}} style={{fontSize:11,padding:'5px 14px',borderRadius:999,cursor:'pointer',border:'1.5px solid',background:pomMode===o.m?'var(--accent-dim)':'transparent',borderColor:pomMode===o.m?'var(--accent)':'var(--border)',color:pomMode===o.m?'var(--accent)':'var(--text3)',fontWeight:600}}>{o.l}</button>)}</div>
            <button onClick={()=>{markDone(ft.id);setShowFocus(false);setPomRun(false);}} className="fm-btn fm-btn-primary" style={{padding:'10px 24px',fontSize:13,background:'linear-gradient(135deg,var(--emerald),#4d8a6a)',color:'#fff',boxShadow:'0 8px 24px rgba(111,172,142,0.25)'}}><CheckCircle size={14}/>Mark Complete</button>
          </div>
        </motion.div>);})()}</AnimatePresence>

      <EvModal isOpen={modalOpen} onClose={()=>setModalOpen(false)} onSave={handleSaveEv} onDelete={handleDelEv} event={editEv} selDate={selDate} ds={ds} de={de} categories={categories} onAddCat={addCategory}/>

      <AnimatePresence>{reminders.length>0&&(<div style={{position:'fixed',bottom:70,right:20,zIndex:55,display:'flex',flexDirection:'column',gap:8}}>{reminders.map(r=>(<motion.div key={r.taskId} initial={{opacity:0,x:50}} animate={{opacity:1,x:0}} exit={{opacity:0,x:50}} transition={spr}><div className="reminder-card"><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:28,height:28,borderRadius:8,background:r.type==='overdue'?'rgba(191,90,90,0.12)':'rgba(201,160,67,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{r.type==='overdue'?<AlertCircle size={12} style={{color:'var(--rose)'}}/>:<Bell size={12} style={{color:'var(--amber)'}}/>}</div><div style={{flex:1,minWidth:0}}><p style={{fontSize:11,fontWeight:700,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</p><p style={{fontSize:10,color:r.type==='overdue'?'var(--rose)':'var(--text3)'}}>{r.type==='overdue'?'Overdue!':r.type==='due-today'?'Due today':'High priority'}</p></div><button onClick={()=>setDismissedReminders(p=>({...p,[r.taskId]:true}))} className="quick-act"><X size={10}/></button></div></div></motion.div>))}</div>)}</AnimatePresence>

      <div style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',zIndex:60,display:'flex',flexDirection:'column-reverse',gap:6,alignItems:'center',pointerEvents:'none'}}>
        <AnimatePresence>{toasts.map(t=>(<motion.div key={t.id} initial={{opacity:0,y:16,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10,scale:0.9}} transition={spr} style={{padding:'8px 16px',borderRadius:10,fontSize:12,fontWeight:600,color:'var(--text)',background:'var(--surface)',boxShadow:'0 8px 24px rgba(0,0,0,0.6)',border:'1.5px solid var(--border2)',whiteSpace:'nowrap',pointerEvents:'auto'}}>{t.msg}</motion.div>))}</AnimatePresence>
      </div>
    </div>
  </>);
}