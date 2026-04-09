import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Check, Star, ChevronRight, ChevronDown,
  Search, Settings, Edit3, Trash2, Eye,
  Calendar, Clock, Inbox, Folder, Home, Sun, Zap, Lightbulb,
  RefreshCw, Target, Coffee, Play, Pause, RotateCcw, Brain,
  Sparkles, Tag, AlertTriangle, FileText, GripHorizontal,
  Monitor, Phone, Briefcase, Archive, ArrowRight, Send, User,
  Minimize2, Flag, Flame, CheckCircle, MapPin, GripVertical,
  Unlink, Link2, ArrowDown
} from 'lucide-react';


/* ═══════════════════════════════════════════
   CONSTANTS & CONFIGURATION
   ═══════════════════════════════════════════ */

/** Available contexts for tasks (where/how work gets done) */
const CONTEXTS = [
  { id: 'computer', label: '@Computer', icon: Monitor, color: '#6366f1' },
  { id: 'calls',    label: '@Calls',    icon: Phone,   color: '#10b981' },
  { id: 'home',     label: '@Home',     icon: Home,    color: '#f59e0b' },
  { id: 'errands',  label: '@Errands',  icon: Archive, color: '#8b5cf6' },
  { id: 'office',   label: '@Office',   icon: Briefcase, color: '#ef4444' },
];

/** Energy levels for tasks */
const ENERGY_LEVELS = [
  { id: 'low',    label: 'Low',    icon: Coffee, color: 'text-sky-500',  bg: 'bg-sky-50',   ring: 'ring-sky-200',   fill: '#0ea5e9' },
  { id: 'medium', label: 'Medium', icon: Zap,    color: 'text-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-200', fill: '#f59e0b' },
  { id: 'high',   label: 'High',   icon: Flame,  color: 'text-rose-500',  bg: 'bg-rose-50',  ring: 'ring-rose-200',  fill: '#ef4444' },
];

/** Time estimate options in minutes */
const TIME_ESTIMATE_OPTIONS = [5, 15, 30, 45, 60, 90, 120];

/** Calendar hours range (6 AM to 11 PM) */
const CALENDAR_HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

/** Height of each hour slot in pixels */
const HOUR_SLOT_HEIGHT = 64;

/** Color palette for projects */
const PROJECT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];


/* ═══════════════════════════════════════════
   ANIMATION PRESETS
   ═══════════════════════════════════════════ */

const ANIMATION = {
  smooth: { type: 'spring', stiffness: 200, damping: 30, mass: 0.8 },
  snappy: { type: 'spring', stiffness: 260, damping: 32, mass: 0.6 },
  gentle: { type: 'spring', stiffness: 150, damping: 25, mass: 1 },
};


/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */

/** Pad a number to 2 digits (e.g., 5 → "05") */
const padTwo = (num) => String(num).padStart(2, '0');

/** Format decimal hours to "HH:MM" (e.g., 9.5 → "09:30") */
const formatHour = (decimalHour) => {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour % 1) * 60);
  return `${padTwo(hours)}:${padTwo(minutes)}`;
};

/** Format seconds to "MM:SS" for the pomodoro timer */
const formatTimer = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${padTwo(minutes)}:${padTwo(seconds)}`;
};


/* ═══════════════════════════════════════════
   AI SUGGESTION HELPERS (simulated)
   ═══════════════════════════════════════════ */

/** Generate AI-suggested subtasks based on task title keywords */
function getAISubtasks(title) {
  const lower = title.toLowerCase();

  const subtaskTemplates = {
    write:   ['Create outline', 'Draft first version', 'Review and edit', 'Get feedback', 'Finalize'],
    prepare: ['Gather requirements', 'Create first draft', 'Add visuals', 'Review', 'Finalize'],
    research: ['Define scope', 'Collect sources', 'Analyze', 'Summarize', 'Report'],
  };

  for (const [keyword, subtasks] of Object.entries(subtaskTemplates)) {
    if (lower.includes(keyword)) return subtasks;
  }

  return ['Define scope', 'Break into steps', 'Execute first step', 'Review progress', 'Complete'];
}

/** Suggest a context based on task title keywords */
function suggestContext(title) {
  const lower = title.toLowerCase();
  if (lower.includes('call') || lower.includes('phone')) return 'calls';
  if (lower.includes('buy') || lower.includes('order')) return 'errands';
  return 'computer';
}

/** Suggest an energy level based on task title keywords */
function suggestEnergy(title) {
  const lower = title.toLowerCase();
  if (lower.includes('write') || lower.includes('create') || lower.includes('prepare')) return 'high';
  if (lower.includes('review') || lower.includes('update')) return 'medium';
  return 'low';
}

/** Suggest a time estimate based on energy level */
function suggestTimeEstimate(energyLevel) {
  const estimates = { high: 90, medium: 45, low: 15 };
  return estimates[energyLevel] || 30;
}


/* ═══════════════════════════════════════════
   SIDEBAR NAVIGATION VIEWS
   ═══════════════════════════════════════════ */

const NAVIGATION_VIEWS = [
  { id: 'today',    label: 'Today',         icon: Sun },
  { id: 'inbox',    label: 'Inbox',         icon: Inbox },
  { id: 'next',     label: 'Next Actions',  icon: Zap },
  { id: 'projects', label: 'Projects',      icon: Folder },
  { id: 'waiting',  label: 'Waiting For',   icon: Clock },
  { id: 'someday',  label: 'Someday/Maybe', icon: Lightbulb },
  { id: 'calendar', label: 'Calendar',      icon: Calendar },
  { id: 'review',   label: 'Weekly Review',  icon: RefreshCw },
];


/* ═══════════════════════════════════════════
   WEEKLY REVIEW STEPS
   ═══════════════════════════════════════════ */

const WEEKLY_REVIEW_STEPS = [
  { title: 'Clear Your Inbox',  desc: 'Process all items.',            icon: Inbox },
  { title: 'Review Projects',   desc: 'Check project progress.',      icon: Folder },
  { title: 'Review Waiting',    desc: 'Follow up on delegated tasks.', icon: Clock },
  { title: 'Review Someday',    desc: 'Promote or remove ideas.',     icon: Lightbulb },
  { title: 'Plan Next Week',    desc: 'Set upcoming priorities.',     icon: Calendar },
];


/* ═══════════════════════════════════════════
   INITIAL DATA
   ═══════════════════════════════════════════ */

const INITIAL_TASKS = [
  // Inbox items (unprocessed)
  {
    id: 1, title: 'Research new project management tools',
    notes: '', status: 'inbox', project: null, context: null,
    energy: null, timeEst: null, dueDate: null, priority: false,
    delegatedTo: '', subtasks: [], tags: [], createdAt: '2024-12-22',
  },
  {
    id: 2, title: 'Call dentist for appointment',
    notes: '', status: 'inbox', project: null, context: null,
    energy: null, timeEst: null, dueDate: null, priority: false,
    delegatedTo: '', subtasks: [], tags: [], createdAt: '2024-12-22',
  },

  // Next Actions (active tasks)
  {
    id: 10, title: 'Write project proposal document',
    notes: 'Include timeline and budget.',
    status: 'next', project: 1, context: 'computer', energy: 'high',
    timeEst: 90, dueDate: '2024-12-28', priority: true,
    delegatedTo: '',
    subtasks: [
      { id: 1, title: 'Draft outline', done: true },
      { id: 2, title: 'Write executive summary', done: false },
      { id: 3, title: 'Add budget section', done: false },
    ],
    tags: ['work', 'urgent'], createdAt: '2024-12-20',
  },
  {
    id: 11, title: 'Review pull requests',
    notes: 'Check the 3 open PRs.',
    status: 'next', project: 1, context: 'computer', energy: 'low',
    timeEst: 30, dueDate: '2024-12-26', priority: false,
    delegatedTo: '', subtasks: [], tags: ['dev'], createdAt: '2024-12-21',
  },
  {
    id: 12, title: 'Order office supplies',
    notes: 'Pens, notebooks',
    status: 'next', project: null, context: 'errands', energy: 'low',
    timeEst: 15, dueDate: '2024-12-27', priority: false,
    delegatedTo: '', subtasks: [], tags: [], createdAt: '2024-12-20',
  },
  {
    id: 13, title: 'Prepare client presentation',
    notes: 'Q4 results and Q1 roadmap.',
    status: 'next', project: 2, context: 'computer', energy: 'high',
    timeEst: 120, dueDate: '2024-12-30', priority: true,
    delegatedTo: '',
    subtasks: [
      { id: 1, title: 'Create slide deck', done: true },
      { id: 2, title: 'Add data visualizations', done: false },
    ],
    tags: ['work', 'client'], createdAt: '2024-12-19',
  },
  {
    id: 14, title: 'Update API documentation',
    notes: '', status: 'next', project: 1, context: 'computer',
    energy: 'medium', timeEst: 60, dueDate: '2024-12-29', priority: false,
    delegatedTo: '', subtasks: [], tags: ['dev'], createdAt: '2024-12-21',
  },
  {
    id: 15, title: 'Schedule 1-on-1 meetings',
    notes: '', status: 'next', project: null, context: 'calls',
    energy: 'low', timeEst: 15, dueDate: '2024-12-26', priority: false,
    delegatedTo: '', subtasks: [], tags: ['team'], createdAt: '2024-12-22',
  },
  {
    id: 16, title: 'Fix dashboard layout bug',
    notes: 'Header alignment issue',
    status: 'next', project: 1, context: 'computer', energy: 'medium',
    timeEst: 45, dueDate: '2024-12-27', priority: false,
    delegatedTo: '',
    subtasks: [
      { id: 1, title: 'Reproduce bug', done: true },
      { id: 2, title: 'Fix CSS', done: false },
    ],
    tags: ['dev'], createdAt: '2024-12-21',
  },

  // Waiting For (delegated tasks)
  {
    id: 20, title: 'Design mockups from Sarah',
    notes: 'Expected by Friday.',
    status: 'waiting', project: 1, context: null, energy: null,
    timeEst: null, dueDate: '2024-12-27', priority: false,
    delegatedTo: 'Sarah Chen', subtasks: [], tags: ['design'], createdAt: '2024-12-20',
  },
  {
    id: 21, title: 'Contract review from legal',
    notes: '', status: 'waiting', project: 2, context: null, energy: null,
    timeEst: null, dueDate: '2024-12-30', priority: true,
    delegatedTo: 'Legal Team', subtasks: [], tags: ['legal'], createdAt: '2024-12-20',
  },

  // Someday / Maybe
  {
    id: 30, title: 'Learn Spanish on Duolingo',
    notes: '', status: 'someday', project: null, context: null, energy: null,
    timeEst: null, dueDate: null, priority: false,
    delegatedTo: '', subtasks: [], tags: ['personal'], createdAt: '2024-12-15',
  },
  {
    id: 31, title: 'Build personal portfolio website',
    notes: '', status: 'someday', project: null, context: null, energy: null,
    timeEst: null, dueDate: null, priority: false,
    delegatedTo: '', subtasks: [], tags: ['dev'], createdAt: '2024-12-10',
  },

  // Completed
  {
    id: 40, title: 'Send weekly status report',
    notes: '', status: 'done', project: null, context: 'computer', energy: 'low',
    timeEst: 15, dueDate: '2024-12-23', priority: false,
    delegatedTo: '', subtasks: [], tags: ['work'], createdAt: '2024-12-22',
  },
  {
    id: 41, title: 'Fix login page bug',
    notes: '', status: 'done', project: 1, context: 'computer', energy: 'medium',
    timeEst: 45, dueDate: '2024-12-22', priority: false,
    delegatedTo: '', subtasks: [], tags: ['dev'], createdAt: '2024-12-20',
  },
];

const INITIAL_PROJECTS = [
  { id: 1, title: 'Website Redesign',       desc: 'Complete overhaul of the company website.', color: '#6366f1' },
  { id: 2, title: 'Q1 Marketing Campaign',  desc: 'Multi-channel marketing for Q1.',          color: '#f59e0b' },
  { id: 3, title: 'Product Launch v2.0',    desc: 'Ship next major product version.',         color: '#10b981' },
];

const INITIAL_CALENDAR_EVENTS = [
  { id: 1, title: 'Team Standup',  loc: 'Room 3A',    startHour: 9,    duration: 0.5, color: '#6366f1', taskId: null },
  { id: 2, title: 'Design Review', loc: 'Zoom',       startHour: 11,   duration: 1,   color: '#ef4444', taskId: null },
  { id: 3, title: 'Lunch Break',   loc: 'Cafeteria',  startHour: 12.5, duration: 1,   color: '#10b981', taskId: null },
  { id: 4, title: 'Client Call',   loc: 'Phone',      startHour: 14,   duration: 1,   color: '#f59e0b', taskId: null },
  { id: 5, title: 'Deep Work',     loc: 'Focus Room', startHour: 16,   duration: 2,   color: '#8b5cf6', taskId: null },
];


/* ═══════════════════════════════════════════
   GLOBAL STYLES
   ═══════════════════════════════════════════ */

const HIDE_SCROLLBAR_CSS = `
  .hide-scroll::-webkit-scrollbar { display: none; }
  .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`;


/* ═══════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
   ═══════════════════════════════════════════ */

/** Section heading with icon and optional count badge */
function SectionHeading({ title, count, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={20} className="text-gray-400" />}
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {count !== undefined && (
        <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

/** Empty state placeholder */
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <Icon size={24} className="text-gray-300" />
      </div>
      <p className="text-gray-500 font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
    </div>
  );
}

/** Displays energy level badge */
function EnergyBadge({ energyId, size = 'normal' }) {
  const energyLevel = ENERGY_LEVELS.find(e => e.id === energyId);
  if (!energyLevel) return null;
  const Icon = energyLevel.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium ${energyLevel.bg} ${energyLevel.color}`}>
      <Icon size={size === 'small' ? 9 : 10} />
      {energyLevel.label}
    </span>
  );
}

/** Displays context badge */
function ContextBadge({ contextId }) {
  const context = CONTEXTS.find(c => c.id === contextId);
  if (!context) return null;
  const Icon = context.icon;
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md text-xs font-medium">
      <Icon size={10} />
      {context.label}
    </span>
  );
}


/* ═══════════════════════════════════════════
   MAIN APPLICATION COMPONENT
   ═══════════════════════════════════════════ */

export default function GTDApp() {

  /* ─── Core State ─── */
  const [currentView, setCurrentView] = useState('today');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [projects] = useState(INITIAL_PROJECTS);
  const [calendarEvents, setCalendarEvents] = useState(INITIAL_CALENDAR_EVENTS);

  /* ─── Selection & UI State ─── */
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [currentEnergy, setCurrentEnergy] = useState('medium');
  const [contextFilter, setContextFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  /* ─── Modal State ─── */
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureInput, setCaptureInput] = useState('');
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState(null);

  /* ─── Pomodoro Timer State ─── */
  const [pomodoroSeconds, setPomodoroSeconds] = useState(1500);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState('work'); // 'work' | 'break'

  /* ─── Weekly Review State ─── */
  const [reviewStepIndex, setReviewStepIndex] = useState(0);
  const [reviewStepChecks, setReviewStepChecks] = useState([false, false, false, false, false]);

  /* ─── Inbox Processing Wizard State ─── */
  const [processingTaskId, setProcessingTaskId] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingContext, setProcessingContext] = useState('computer');
  const [processingEnergy, setProcessingEnergy] = useState('medium');
  const [processingTime, setProcessingTime] = useState(30);
  const [processingProject, setProcessingProject] = useState(null);

  /* ─── Calendar Event Creation State ─── */
  const [newEventHour, setNewEventHour] = useState(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');

  /* ─── Inline Editing State ─── */
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  /* ─── AI Suggestion State ─── */
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [aiSuggestedSubtasks, setAiSuggestedSubtasks] = useState([]);

  /* ─── Drag & Drop State ─── */
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragGhostHour, setDragGhostHour] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [showUnscheduleZone, setShowUnscheduleZone] = useState(false);

  /* ─── Feedback Toast State ─── */
  const [dropFeedback, setDropFeedback] = useState(null);

  /* ─── Refs ─── */
  const calendarTimelineRef = useRef(null);
  const todayTimelineRef = useRef(null);
  const captureInputRef = useRef(null);


  /* ═══════════════════════════════════════════
     DERIVED / COMPUTED VALUES
     ═══════════════════════════════════════════ */

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const todayDateString = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Task lists filtered by status
  const inboxTasks   = useMemo(() => tasks.filter(t => t.status === 'inbox'),   [tasks]);
  const nextTasks    = useMemo(() => tasks.filter(t => t.status === 'next'),    [tasks]);
  const waitingTasks = useMemo(() => tasks.filter(t => t.status === 'waiting'), [tasks]);
  const somedayTasks = useMemo(() => tasks.filter(t => t.status === 'someday'), [tasks]);
  const doneTasks    = useMemo(() => tasks.filter(t => t.status === 'done'),    [tasks]);

  // Overall progress
  const overallProgress = tasks.length > 0
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0;

  // Map of taskId → calendar event for quick lookup
  const scheduledTaskMap = useMemo(() => {
    const map = {};
    calendarEvents.forEach(event => {
      if (event.taskId) map[event.taskId] = event;
    });
    return map;
  }, [calendarEvents]);

  // Layout state: is the detail panel expanded in Today view?
  const isDetailExpanded = currentView === 'today' && selectedTaskId !== null;
  const isTaskBeingDragged = draggedTask !== null;
  const isEventBeingDraggedToUnschedule = draggedEvent !== null && draggedEvent.taskId;

  /**
   * Smart task suggestions for "Today's Focus"
   * Scores tasks by priority, due date proximity, and energy match
   */
  const todaySuggestedTasks = useMemo(() => {
    return nextTasks
      .map(task => {
        let score = 0;

        // Prioritized tasks get a boost
        if (task.priority) score += 30;

        // Due date urgency scoring
        if (task.dueDate) {
          const daysUntilDue = Math.ceil((new Date(task.dueDate) - now) / 86400000);
          if (daysUntilDue <= 1) score += 40;
          else if (daysUntilDue <= 3) score += 25;
          else if (daysUntilDue <= 7) score += 10;
        }

        // Energy level match bonus
        if (task.energy === currentEnergy) score += 15;
        if (task.energy === 'high' && currentEnergy === 'low') score -= 10;

        return { ...task, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [nextTasks, currentEnergy]);


  /* ═══════════════════════════════════════════
     EFFECTS (Side Effects & Timers)
     ═══════════════════════════════════════════ */

  // Auto-focus the capture input when modal opens
  useEffect(() => {
    if (showCaptureModal && captureInputRef.current) {
      captureInputRef.current.focus();
    }
  }, [showCaptureModal]);

  // Pomodoro countdown timer
  useEffect(() => {
    if (!pomodoroRunning) return;

    const interval = setInterval(() => {
      setPomodoroSeconds(prev => {
        if (prev <= 1) {
          setPomodoroRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoroRunning]);

  // Event resizing (drag to change duration)
  useEffect(() => {
    if (!resizingEvent) return;

    const handleMouseMove = (e) => {
      const deltaHours = (e.clientY - resizingEvent.startY) / HOUR_SLOT_HEIGHT;
      const snappedDuration = Math.round((resizingEvent.originalDuration + deltaHours) * 4) / 4;

      setCalendarEvents(prev =>
        prev.map(ev =>
          ev.id === resizingEvent.eventId
            ? { ...ev, duration: Math.max(0.25, Math.min(snappedDuration, 6)) }
            : ev
        )
      );
    };

    const handleMouseUp = () => setResizingEvent(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingEvent]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't hijack typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !showCaptureModal) {
        e.preventDefault();
        setShowCaptureModal(true);
      }

      if (e.key === 'Escape') {
        setShowCaptureModal(false);
        setShowFocusMode(false);
        setSelectedTaskId(null);
        setProcessingTaskId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCaptureModal, selectedTaskId]);

  // Scroll timeline to current hour on view change
  useEffect(() => {
    const timelineRef = currentView === 'calendar'
      ? calendarTimelineRef
      : currentView === 'today'
        ? todayTimelineRef
        : null;

    if (timelineRef?.current) {
      const scrollTarget = Math.max(0, (currentDecimalHour - CALENDAR_HOURS[0] - 1.5) * HOUR_SLOT_HEIGHT);
      timelineRef.current.scrollTop = scrollTarget;
    }
  }, [currentView]);


  /* ═══════════════════════════════════════════
     TASK ACTIONS
     ═══════════════════════════════════════════ */

  /** Update specific fields on a task */
  const updateTask = useCallback((taskId, updates) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  /** Delete a task and deselect if it was selected */
  const deleteTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  }, [selectedTaskId]);

  /** Toggle task selection */
  const selectTask = (taskId) => {
    setSelectedTaskId(prev => prev === taskId ? null : taskId);
    setEditingField(null);
    setAiSuggestedSubtasks([]);
  };

  /** Capture a new task into the Inbox */
  const handleCapture = () => {
    if (!captureInput.trim()) return;

    const newTask = {
      id: Date.now(),
      title: captureInput.trim(),
      notes: '',
      status: 'inbox',
      project: null,
      context: null,
      energy: null,
      timeEst: null,
      dueDate: null,
      priority: false,
      delegatedTo: '',
      subtasks: [],
      tags: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTasks(prev => [...prev, newTask]);
    setCaptureInput('');
    setShowCaptureModal(false);
  };

  /** Add a new subtask to the selected task */
  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim() || !selectedTaskId) return;

    const newSubtask = {
      id: Date.now(),
      title: newSubtaskInput.trim(),
      done: false,
    };

    updateTask(selectedTaskId, {
      subtasks: [...(selectedTask?.subtasks || []), newSubtask],
    });
    setNewSubtaskInput('');
  };

  /** Trigger AI subtask breakdown (simulated delay) */
  const handleAIBreakdown = () => {
    if (!selectedTask) return;
    setAiIsThinking(true);

    setTimeout(() => {
      setAiSuggestedSubtasks(getAISubtasks(selectedTask.title));
      setAiIsThinking(false);
    }, 800);
  };

  /** Apply all AI-suggested subtasks to the selected task */
  const applyAISuggestions = () => {
    if (!selectedTask) return;

    const newSubtasks = aiSuggestedSubtasks.map((title, index) => ({
      id: Date.now() + index,
      title,
      done: false,
    }));

    updateTask(selectedTask.id, {
      subtasks: [...selectedTask.subtasks, ...newSubtasks],
    });
    setAiSuggestedSubtasks([]);
  };


  /* ═══════════════════════════════════════════
     INBOX PROCESSING WIZARD
     ═══════════════════════════════════════════ */

  const handleProcessAction = (taskId, action) => {
    switch (action) {
      case 'delete':
        deleteTask(taskId);
        setProcessingTaskId(null);
        setProcessingStep(0);
        break;

      case 'someday':
        updateTask(taskId, { status: 'someday' });
        setProcessingTaskId(null);
        setProcessingStep(0);
        break;

      case 'next': {
        // Move to step 2: configure the task
        setProcessingStep(1);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setProcessingContext(suggestContext(task.title));
          setProcessingEnergy(suggestEnergy(task.title));
          setProcessingTime(suggestTimeEstimate(suggestEnergy(task.title)));
          setProcessingProject(null);
        }
        break;
      }

      case 'waiting':
        setProcessingStep(3);
        break;

      case 'confirm-next':
        updateTask(taskId, {
          status: 'next',
          context: processingContext,
          energy: processingEnergy,
          timeEst: processingTime,
          project: processingProject,
        });
        setProcessingTaskId(null);
        setProcessingStep(0);
        break;

      case 'confirm-waiting':
        updateTask(taskId, {
          status: 'waiting',
          delegatedTo: editingValue || 'Someone',
        });
        setProcessingTaskId(null);
        setProcessingStep(0);
        setEditingValue('');
        break;
    }
  };


  /* ═══════════════════════════════════════════
     CALENDAR EVENT ACTIONS
     ═══════════════════════════════════════════ */

  /** Add a new calendar event at the specified hour */
  const handleAddCalendarEvent = () => {
    if (!newEventTitle.trim() || newEventHour === null) return;

    const newEvent = {
      id: Date.now(),
      title: newEventTitle.trim(),
      loc: newEventLocation.trim() || '',
      startHour: newEventHour,
      duration: 1,
      color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      taskId: null,
    };

    setCalendarEvents(prev => [...prev, newEvent]);
    setNewEventHour(null);
    setNewEventTitle('');
    setNewEventLocation('');
  };

  /** Start resizing an event by dragging its bottom edge */
  const startEventResize = useCallback((mouseEvent, eventId) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    const event = calendarEvents.find(e => e.id === eventId);
    if (event) {
      setResizingEvent({
        eventId,
        startY: mouseEvent.clientY,
        originalDuration: event.duration,
      });
    }
  }, [calendarEvents]);


  /* ═══════════════════════════════════════════
     DRAG & DROP HANDLERS
     ═══════════════════════════════════════════ */

  /** Calculate the hour from a mouse position on the timeline */
  const computeHourFromMouse = (mouseEvent, timelineRef) => {
    if (!timelineRef?.current) return null;

    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = mouseEvent.clientY - rect.top + timelineRef.current.scrollTop;
    const rawHour = relativeY / HOUR_SLOT_HEIGHT + CALENDAR_HOURS[0];

    // Snap to 15-minute intervals
    return Math.max(
      CALENDAR_HOURS[0],
      Math.min(
        Math.round(rawHour * 4) / 4,
        CALENDAR_HOURS[CALENDAR_HOURS.length - 1]
      )
    );
  };

  // ─── Task Drag Handlers ───

  const onTaskDragStart = (mouseEvent, task) => {
    setDraggedTask(task);
    mouseEvent.dataTransfer.effectAllowed = 'move';
    mouseEvent.dataTransfer.setData('text/plain', `task:${task.id}`);

    // Create a custom drag ghost
    const ghost = document.createElement('div');
    ghost.textContent = task.title;
    ghost.style.cssText = `
      position: absolute; left: -9999px;
      padding: 8px 16px; background: #6366f1; color: #fff;
      border-radius: 14px; font-size: 13px; font-weight: 600;
      max-width: 220px; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; font-family: system-ui;
      box-shadow: 0 8px 24px rgba(99,102,241,0.4);
    `;
    document.body.appendChild(ghost);
    mouseEvent.dataTransfer.setDragImage(ghost, 110, 18);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };

  const onTaskDragEnd = () => {
    setDraggedTask(null);
    setDragGhostHour(null);
    setShowUnscheduleZone(false);
  };

  // ─── Event Drag Handlers ───

  const onEventDragStart = (mouseEvent, event) => {
    setDraggedEvent(event);
    mouseEvent.dataTransfer.effectAllowed = 'move';
    mouseEvent.dataTransfer.setData('text/plain', `event:${event.id}`);
  };

  const onEventDragEnd = () => {
    setDraggedEvent(null);
    setDragGhostHour(null);
    setShowUnscheduleZone(false);
  };

  // ─── Timeline Drop Zone Handlers ───

  const onTimelineDragOver = (mouseEvent, timelineRef) => {
    mouseEvent.preventDefault();
    mouseEvent.dataTransfer.dropEffect = 'move';
    setDragGhostHour(computeHourFromMouse(mouseEvent, timelineRef));
  };

  const onTimelineDrop = (mouseEvent, timelineRef) => {
    mouseEvent.preventDefault();
    const dropHour = computeHourFromMouse(mouseEvent, timelineRef);
    if (dropHour === null) return;

    const data = mouseEvent.dataTransfer.getData('text/plain');

    if (data.startsWith('task:')) {
      // Dropping a task onto the timeline → create a linked calendar event
      const taskId = parseInt(data.split(':')[1]);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Remove any existing event linked to this task
      setCalendarEvents(prev => prev.filter(ev => ev.taskId !== taskId));

      // Determine event properties from the task
      const project = projects.find(p => p.id === task.project);
      const duration = task.timeEst ? Math.max(task.timeEst / 60, 0.25) : 1;
      const color = project?.color
        || (task.energy === 'high' ? '#ef4444' : task.energy === 'medium' ? '#f59e0b' : '#6366f1');

      const contextLabel = task.context
        ? CONTEXTS.find(c => c.id === task.context)?.label || ''
        : '';

      setCalendarEvents(prev => [...prev, {
        id: Date.now(),
        title: task.title,
        loc: contextLabel,
        startHour: dropHour,
        duration: Math.min(duration, 4),
        color,
        taskId: task.id,
      }]);

      // Show success feedback toast
      setDropFeedback({ type: 'scheduled', taskTitle: task.title, hour: dropHour });
      setTimeout(() => setDropFeedback(null), 2200);

    } else if (data.startsWith('event:')) {
      // Moving an existing event to a new time
      const eventId = parseInt(data.split(':')[1]);
      setCalendarEvents(prev =>
        prev.map(ev => ev.id === eventId ? { ...ev, startHour: dropHour } : ev)
      );
    }

    // Reset drag state
    setDraggedTask(null);
    setDraggedEvent(null);
    setDragGhostHour(null);
  };

  const onTimelineDragLeave = (mouseEvent) => {
    if (mouseEvent.currentTarget.contains(mouseEvent.relatedTarget)) return;
    setDragGhostHour(null);
  };

  // ─── Unschedule Drop Zone Handlers ───

  const onUnscheduleDragOver = (mouseEvent) => {
    mouseEvent.preventDefault();
    mouseEvent.dataTransfer.dropEffect = 'move';
    setShowUnscheduleZone(true);
  };

  const onUnscheduleDragLeave = () => setShowUnscheduleZone(false);

  const onUnscheduleDrop = (mouseEvent) => {
    mouseEvent.preventDefault();
    const data = mouseEvent.dataTransfer.getData('text/plain');

    if (data.startsWith('event:')) {
      const eventId = parseInt(data.split(':')[1]);
      const event = calendarEvents.find(e => e.id === eventId);

      if (event) {
        setCalendarEvents(prev => prev.filter(e => e.id !== eventId));

        if (event.taskId) {
          setDropFeedback({ type: 'unscheduled', taskTitle: event.title });
          setTimeout(() => setDropFeedback(null), 2200);
        }
      }
    }

    setShowUnscheduleZone(false);
    setDraggedEvent(null);
    setDragGhostHour(null);
  };


  /* ═══════════════════════════════════════════
     TIMELINE COMPONENT (shared between views)
     ═══════════════════════════════════════════ */

  const renderTimeline = (timelineRef, heightStyle, isCompact = false) => {
    const currentTimeTop = (currentDecimalHour - CALENDAR_HOURS[0]) * HOUR_SLOT_HEIGHT;
    const showCurrentTimeLine = currentDecimalHour >= CALENDAR_HOURS[0]
      && currentDecimalHour <= CALENDAR_HOURS[CALENDAR_HOURS.length - 1];
    const showDropPreview = isTaskBeingDragged && dragGhostHour !== null;
    const labelWidth = isCompact ? 'w-12' : 'w-14';

    return (
      <div
        ref={timelineRef}
        className={`overflow-y-auto hide-scroll relative select-none ${isTaskBeingDragged ? 'bg-indigo-50 bg-opacity-40' : ''}`}
        style={{
          height: heightStyle,
          cursor: resizingEvent ? 'ns-resize' : 'default',
          transition: 'background-color 0.3s ease',
        }}
        onClick={(e) => {
          // Click on empty space to create a new event
          if (e.target.closest('.tl-ev') || e.target.closest('.tl-fm') || resizingEvent) return;
          if (!timelineRef?.current) return;

          const rect = timelineRef.current.getBoundingClientRect();
          const relY = e.clientY - rect.top + timelineRef.current.scrollTop;
          const clickedHour = Math.floor(relY / HOUR_SLOT_HEIGHT) + CALENDAR_HOURS[0];

          if (clickedHour >= CALENDAR_HOURS[0] && clickedHour <= CALENDAR_HOURS[CALENDAR_HOURS.length - 1]) {
            setNewEventHour(clickedHour);
            setNewEventTitle('');
            setNewEventLocation('');
          }
        }}
        onDragOver={(e) => onTimelineDragOver(e, timelineRef)}
        onDrop={(e) => onTimelineDrop(e, timelineRef)}
        onDragLeave={onTimelineDragLeave}
      >
        {/* "Drop to schedule" overlay hint */}
        <AnimatePresence>
          {isTaskBeingDragged && !dragGhostHour && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <div className="bg-indigo-500 bg-opacity-90 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold backdrop-blur-sm">
                <ArrowDown size={15} className="animate-bounce" />
                Drop to schedule
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline grid */}
        <div className="relative" style={{ height: CALENDAR_HOURS.length * HOUR_SLOT_HEIGHT }}>

          {/* Hour labels and grid lines */}
          {CALENDAR_HOURS.map((hour, index) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: index * HOUR_SLOT_HEIGHT, height: HOUR_SLOT_HEIGHT }}
            >
              <div className={`${labelWidth} text-right pr-2 shrink-0`} style={{ paddingTop: 2 }}>
                <span className="text-xs font-semibold text-gray-300 tabular-nums">
                  {formatHour(hour)}
                </span>
              </div>
              <div
                className="flex-1 border-t border-gray-100"
                style={{
                  borderColor: isTaskBeingDragged ? '#c7d2fe' : undefined,
                  transition: 'border-color 0.3s ease',
                }}
              />
            </div>
          ))}

          {/* Current time indicator */}
          {showCurrentTimeLine && (
            <div
              className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
              style={{ top: currentTimeTop }}
            >
              <div className={`${labelWidth} flex justify-end pr-0.5`}>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-rose-500 to-rose-300 opacity-60" />
            </div>
          )}

          {/* Drop preview ghost (when dragging a task) */}
          <AnimatePresence>
            {showDropPreview && draggedTask && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-100 bg-opacity-50 z-25 pointer-events-none overflow-hidden backdrop-blur-sm"
                style={{
                  top: (dragGhostHour - CALENDAR_HOURS[0]) * HOUR_SLOT_HEIGHT + 2,
                  height: Math.max(
                    (draggedTask.timeEst ? Math.min(draggedTask.timeEst / 60, 4) : 1) * HOUR_SLOT_HEIGHT - 4,
                    26
                  ),
                  left: isCompact ? 50 : 58,
                  right: 8,
                }}
              >
                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <Link2 size={10} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-indigo-700 truncate">{draggedTask.title}</p>
                    <p className="text-xs text-indigo-500">
                      {formatHour(dragGhostHour)} · {draggedTask.timeEst || 60}min
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop preview ghost (when moving an existing event) */}
          <AnimatePresence>
            {draggedEvent && dragGhostHour !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute rounded-xl border-2 border-dashed pointer-events-none z-5"
                style={{
                  top: (dragGhostHour - CALENDAR_HOURS[0]) * HOUR_SLOT_HEIGHT + 2,
                  height: Math.max(draggedEvent.duration * HOUR_SLOT_HEIGHT - 4, 26),
                  left: isCompact ? 50 : 58,
                  right: 8,
                  borderColor: draggedEvent.color,
                  backgroundColor: draggedEvent.color + '20',
                }}
              />
            )}
          </AnimatePresence>

          {/* Rendered calendar events */}
          <AnimatePresence>
            {calendarEvents.map(event => {
              const topPosition = (event.startHour - CALENDAR_HOURS[0]) * HOUR_SLOT_HEIGHT + 2;
              const eventHeight = Math.max(event.duration * HOUR_SLOT_HEIGHT - 4, 26);
              const isLinkedToTask = event.taskId !== null;
              const isCurrentlyDragged = draggedEvent?.id === event.id;

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{
                    opacity: isCurrentlyDragged ? 0.3 : 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.25 } }}
                  transition={ANIMATION.smooth}
                  className="tl-ev absolute rounded-xl group overflow-hidden shadow-md"
                  style={{
                    top: topPosition,
                    height: eventHeight,
                    left: isCompact ? 50 : 58,
                    right: 8,
                    zIndex: resizingEvent?.eventId === event.id ? 15 : 10,
                    backgroundColor: event.color + '18',
                    borderLeft: `3px solid ${event.color}`,
                    cursor: resizingEvent ? 'ns-resize' : 'grab',
                  }}
                  draggable={!resizingEvent}
                  onDragStart={(e) => onEventDragStart(e, event)}
                  onDragEnd={onEventDragEnd}
                  whileHover={resizingEvent ? {} : { boxShadow: `0 6px 16px ${event.color}25`, scale: 1.01 }}
                >
                  {/* Event content */}
                  <div className="px-3 py-1.5 h-full flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      {isLinkedToTask && (
                        <Link2 size={9} style={{ color: event.color }} className="shrink-0 opacity-60" />
                      )}
                      <p className="text-xs font-bold truncate" style={{ color: event.color }}>
                        {event.title}
                      </p>
                    </div>

                    {eventHeight > 36 && event.loc && (
                      <p className="text-xs text-gray-400 truncate flex items-center gap-0.5 mt-0.5">
                        <MapPin size={8} />{event.loc}
                      </p>
                    )}

                    {eventHeight > 52 && (
                      <p className="text-xs text-gray-300 mt-0.5 tabular-nums">
                        {formatHour(event.startHour)} – {formatHour(event.startHour + event.duration)}
                      </p>
                    )}
                  </div>

                  {/* Delete button (on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarEvents(prev => prev.filter(ev => ev.id !== event.id));
                    }}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-full p-0.5 text-gray-500 hover:text-red-400 transition-opacity"
                  >
                    <X size={10} />
                  </button>

                  {/* Resize handle (bottom edge) */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-3 flex items-end justify-center cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(transparent, ${event.color}30)` }}
                    onMouseDown={(e) => startEventResize(e, event.id)}
                  >
                    <GripHorizontal size={10} className="text-gray-400 mb-0.5" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* New event creation form (appears when clicking an empty slot) */}
          <AnimatePresence>
            {newEventHour !== null && !isTaskBeingDragged && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="tl-fm absolute bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-30"
                style={{
                  top: (newEventHour - CALENDAR_HOURS[0]) * HOUR_SLOT_HEIGHT,
                  left: isCompact ? 50 : 58,
                  right: 8,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs text-gray-400 mb-2 font-medium">{formatHour(newEventHour)}</p>

                <input
                  autoFocus
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCalendarEvent();
                    if (e.key === 'Escape') setNewEventHour(null);
                  }}
                  placeholder="Event title..."
                  className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg mb-1.5 outline-none focus:border-indigo-400 transition-colors"
                />

                <input
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCalendarEvent();
                    if (e.key === 'Escape') setNewEventHour(null);
                  }}
                  placeholder="Location..."
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg mb-2 outline-none focus:border-indigo-400 transition-colors"
                />

                <div className="flex gap-1.5">
                  <button
                    onClick={handleAddCalendarEvent}
                    className="flex-1 text-xs bg-indigo-500 text-white rounded-lg py-1.5 hover:bg-indigo-600 font-semibold transition-colors"
                  >
                    Add Event
                  </button>
                  <button
                    onClick={() => setNewEventHour(null)}
                    className="text-xs bg-gray-100 text-gray-500 rounded-lg py-1.5 px-3 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    );
  };


  /* ═══════════════════════════════════════════
     TASK DETAIL PANEL
     ═══════════════════════════════════════════ */

  const renderTaskDetailPanel = () => {
    // Empty state when no task is selected
    if (!selectedTask) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Eye size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Select a task</p>
        </div>
      );
    }

    const completedSubtaskCount = selectedTask.subtasks.filter(s => s.done).length;
    const project = projects.find(p => p.id === selectedTask.project);
    const scheduledEvent = scheduledTaskMap[selectedTask.id];
    const energyLevel = ENERGY_LEVELS.find(e => e.id === selectedTask.energy);

    return (
      <div className="p-5 overflow-y-auto hide-scroll h-full">

        {/* ── Header with action buttons ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: (project?.color || '#6366f1') + '18' }}
            >
              <Target size={14} style={{ color: project?.color || '#6366f1' }} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => { setFocusTaskId(selectedTask.id); setShowFocusMode(true); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-indigo-500 transition-colors"
            >
              <Play size={14} />
            </button>
            <button
              onClick={() => updateTask(selectedTask.id, { priority: !selectedTask.priority })}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Star size={14} className={selectedTask.priority ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
            </button>
            <button
              onClick={() => deleteTask(selectedTask.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => { setSelectedTaskId(null); setEditingField(null); setAiSuggestedSubtasks([]); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Title (click to edit) ── */}
        {editingField === 'title' ? (
          <input
            autoFocus
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => {
              if (editingValue.trim()) updateTask(selectedTask.id, { title: editingValue.trim() });
              setEditingField(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editingValue.trim()) updateTask(selectedTask.id, { title: editingValue.trim() });
                setEditingField(null);
              }
            }}
            className="text-lg font-extrabold text-gray-900 bg-gray-50 rounded-xl px-3 py-2 w-full outline-none border border-gray-200 mb-4"
          />
        ) : (
          <h2
            onClick={() => { setEditingField('title'); setEditingValue(selectedTask.title); }}
            className="text-lg font-extrabold text-gray-900 mb-2 cursor-pointer hover:text-indigo-600 transition-colors leading-snug"
          >
            {selectedTask.title}
          </h2>
        )}

        {/* ── Tags / badges row ── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: project.color }}
            >
              {project.title}
            </span>
          )}

          {energyLevel && (() => {
            const Icon = energyLevel.icon;
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${energyLevel.bg} ${energyLevel.color} ring-1 ${energyLevel.ring}`}>
                <Icon size={9} />{energyLevel.label}
              </span>
            );
          })()}

          {selectedTask.timeEst && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
              <Clock size={9} />{selectedTask.timeEst}m
            </span>
          )}
        </div>

        {/* ── Scheduled event indicator ── */}
        {scheduledEvent && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <Calendar size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-700">
                Scheduled at {formatHour(scheduledEvent.startHour)}
              </p>
              <p className="text-xs text-indigo-500">
                {formatHour(scheduledEvent.startHour)} – {formatHour(scheduledEvent.startHour + scheduledEvent.duration)} · {Math.round(scheduledEvent.duration * 60)}min
              </p>
            </div>
            <button
              onClick={() => setCalendarEvents(prev => prev.filter(ev => ev.id !== scheduledEvent.id))}
              className="text-indigo-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <Unlink size={13} />
            </button>
          </div>
        )}
        <div className="space-y-4">

          {/* ── Notes ── */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Notes</label>
            {editingField === 'notes' ? (
              <textarea
                autoFocus
                value={editingValue}
                onChange={(e) => {
                  setEditingValue(e.target.value);
                  updateTask(selectedTask.id, { notes: e.target.value });
                }}
                onBlur={() => setEditingField(null)}
                className="w-full bg-gray-50 text-gray-700 text-sm rounded-xl p-3 outline-none border border-gray-200 resize-none"
                style={{ minHeight: 64 }}
                placeholder="Add notes..."
              />
            ) : (
              <div
                onClick={() => { setEditingField('notes'); setEditingValue(selectedTask.notes); }}
                className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors"
                style={{ minHeight: 40 }}
              >
                {selectedTask.notes || <span className="text-gray-400 italic">Click to add notes...</span>}
              </div>
            )}
          </div>

          {/* ── Status selector ── */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {['next', 'waiting', 'someday', 'done'].map(status => (
                <button
                  key={status}
                  onClick={() => updateTask(selectedTask.id, { status })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    selectedTask.status === status
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {status === 'someday' ? 'Someday' : status}
                </button>
              ))}
            </div>
          </div>

          {/* ── Subtasks ── */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Subtasks ({completedSubtaskCount}/{selectedTask.subtasks.length})
              </label>
              <button
                onClick={handleAIBreakdown}
                className="text-xs bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 shadow-sm"
              >
                {aiIsThinking ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <RefreshCw size={9} />
                  </motion.div>
                ) : (
                  <Sparkles size={9} />
                )}
                AI
              </button>
            </div>

            {/* Subtask progress bar */}
            {selectedTask.subtasks.length > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
                <motion.div
                  animate={{ width: `${(completedSubtaskCount / selectedTask.subtasks.length) * 100}%` }}
                  transition={ANIMATION.smooth}
                  className="h-full bg-emerald-400 rounded-full"
                />
              </div>
            )}

            {/* Subtask list */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-2">
              {selectedTask.subtasks.map(subtask => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 py-1.5 px-1 group rounded-lg hover:bg-white cursor-pointer transition-colors"
                  onClick={() =>
                    updateTask(selectedTask.id, {
                      subtasks: selectedTask.subtasks.map(s =>
                        s.id === subtask.id ? { ...s, done: !s.done } : s
                      ),
                    })
                  }
                >
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    subtask.done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}>
                    {subtask.done && <Check size={9} className="text-white" strokeWidth={3} />}
                  </div>

                  <span className={`text-sm flex-1 transition-colors ${subtask.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {subtask.title}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTask(selectedTask.id, {
                        subtasks: selectedTask.subtasks.filter(s => s.id !== subtask.id),
                      });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}

              {selectedTask.subtasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2 italic">No subtasks</p>
              )}
            </div>

            {/* AI suggestions */}
            <AnimatePresence>
              {aiSuggestedSubtasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="mt-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100 overflow-hidden"
                >
                  <p className="text-xs text-indigo-500 font-bold mb-1.5 flex items-center gap-1">
                    <Sparkles size={10} />Suggestions
                  </p>
                  {aiSuggestedSubtasks.map((suggestion, index) => (
                    <p key={index} className="text-xs text-indigo-600 py-0.5 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-indigo-400" />
                      {suggestion}
                    </p>
                  ))}
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={applyAISuggestions}
                      className="text-xs bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-semibold"
                    >
                      Add All
                    </button>
                    <button
                      onClick={() => setAiSuggestedSubtasks([])}
                      className="text-xs bg-gray-200 text-gray-500 px-2.5 py-1 rounded-lg"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add subtask input */}
            <div className="flex items-center gap-1.5 mt-2">
              <input
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                placeholder="Add subtask..."
                className="flex-1 text-xs px-2.5 py-2 bg-white text-gray-700 rounded-lg outline-none border border-gray-200 focus:border-indigo-400 transition-colors"
              />
              <button
                onClick={handleAddSubtask}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setFocusTaskId(selectedTask.id); setShowFocusMode(true); }}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-xl transition-shadow"
            >
              <Play size={13} />Focus
            </button>
            <button
              onClick={() =>
                updateTask(selectedTask.id, {
                  status: selectedTask.status === 'done' ? 'next' : 'done',
                })
              }
              className={`py-2.5 px-4 text-sm font-bold rounded-xl flex items-center gap-2 border transition-colors ${
                selectedTask.status === 'done'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CheckCircle size={13} />
              {selectedTask.status === 'done' ? 'Done' : 'Complete'}
            </button>
          </div>
        </div>
      </div>
    );
  };


  /* ═══════════════════════════════════════════
     TODAY VIEW
     ═══════════════════════════════════════════ */

  const renderTodayView = () => (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Left column: Calendar Timeline ── */}
      <motion.div
        className="h-full bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden"
        animate={{ width: isDetailExpanded ? 360 : 360 }}
        transition={ANIMATION.gentle}
      >
        {/* Timeline header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Calendar size={13} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 leading-none">Schedule</h2>
              <p className="text-xs text-gray-400 mt-0.5">{todayDateString}</p>
            </div>
          </div>

          {/* Day progress bar */}
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                animate={{
                  width: `${Math.min(
                    ((currentDecimalHour - CALENDAR_HOURS[0]) / (CALENDAR_HOURS[CALENDAR_HOURS.length - 1] - CALENDAR_HOURS[0])) * 100,
                    100
                  )}%`,
                }}
                transition={ANIMATION.smooth}
              />
            </div>
            <span className="text-xs text-gray-400 font-semibold tabular-nums">
              {formatHour(currentDecimalHour)}
            </span>
          </div>
        </div>

        {/* Unschedule drop zone (visible when dragging a linked event) */}
        <AnimatePresence>
          {isEventBeingDraggedToUnschedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 52, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onDragOver={onUnscheduleDragOver}
              onDragLeave={onUnscheduleDragLeave}
              onDrop={onUnscheduleDrop}
              className={`mx-2 mt-2 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors duration-200 overflow-hidden ${
                showUnscheduleZone
                  ? 'border-red-400 bg-red-50 text-red-500'
                  : 'border-gray-300 bg-gray-50 text-gray-400'
              }`}
            >
              <Unlink size={14} />
              <span className="text-xs font-semibold">Drop to unschedule</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The timeline itself */}
        <div className="flex-1 overflow-hidden bg-white">
          {renderTimeline(todayTimelineRef, '100%', isDetailExpanded)}
        </div>
      </motion.div>

      {/* ── Center + Right: Focus list + Detail panel ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Center: Today's Focus task list */}
        <motion.div
          className="h-full flex flex-col overflow-hidden bg-gray-50"
          animate={{ flex: isDetailExpanded ? '0 0 400px' : '1 1 auto' }}
          transition={ANIMATION.gentle}
        >
          {/* Focus list header */}
          <div className="shrink-0 px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <motion.h1
                  layout
                  transition={ANIMATION.gentle}
                  className="font-extrabold text-gray-900"
                  style={{ fontSize: isDetailExpanded ? 18 : 22 }}
                >
                  Today's Focus
                </motion.h1>
              </div>

              {/* Energy filter + Add button (hidden when detail is open) */}
              <AnimatePresence>
                {!isDetailExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center gap-2"
                  >
                    {/* Energy level selector */}
                    <div className="flex items-center gap-1 bg-white rounded-xl px-2 py-1.5 border border-gray-200 shadow-sm">
                      {ENERGY_LEVELS.map(level => {
                        const Icon = level.icon;
                        return (
                          <button
                            key={level.id}
                            onClick={() => setCurrentEnergy(level.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 ${
                              currentEnergy === level.id
                                ? `${level.bg} ${level.color} shadow-sm`
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <Icon size={10} />{level.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setShowCaptureModal(true)}
                      className="px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 flex items-center gap-1 shadow-md shadow-indigo-200 transition-colors"
                    >
                      <Plus size={13} />Add
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Overall progress bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">
                  {doneTasks.length} of {tasks.length} done
                </span>
                <span className="text-xs font-bold text-indigo-500">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  animate={{ width: `${overallProgress}%` }}
                  transition={ANIMATION.smooth}
                />
              </div>
            </div>

            {/* Drag hint banners */}
            <AnimatePresence>
              {isTaskBeingDragged && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 36, marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 flex items-center gap-2 text-indigo-600 overflow-hidden"
                >
                  <ArrowDown size={12} className="animate-bounce" />
                  <span className="text-xs font-semibold">Drop on the timeline to schedule</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isEventBeingDraggedToUnschedule && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 40, marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  onDragOver={onUnscheduleDragOver}
                  onDragLeave={onUnscheduleDragLeave}
                  onDrop={onUnscheduleDrop}
                  className={`rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors duration-200 overflow-hidden ${
                    showUnscheduleZone
                      ? 'border-red-400 bg-red-50 text-red-500'
                      : 'border-gray-300 bg-gray-50 text-gray-400'
                  }`}
                >
                  <Unlink size={12} />
                  <span className="text-xs font-semibold">Drop to unschedule</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Task cards list */}
          <div className="flex-1 overflow-y-auto hide-scroll px-3 pb-4">
            <div className="space-y-1.5">
              {todaySuggestedTasks.map((task, index) => {
                const isCompleted = task.status === 'done';
                const isSelected = selectedTaskId === task.id;
                const isHovered = hoveredTaskId === task.id;
                const isDragging = draggedTask?.id === task.id;
                const scheduledEvent = scheduledTaskMap[task.id];
                const completedSubs = task.subtasks.filter(s => s.done).length;

                // Determine left accent color
                const accentColor = task.priority
                  ? '#ef4444'
                  : task.energy === 'high' ? '#ef4444'
                  : task.energy === 'medium' ? '#f59e0b'
                  : '#38bdf8';

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: isDragging ? 0.35 : 1,
                      y: 0,
                      scale: isDragging ? 0.96 : 1,
                      filter: isDragging ? 'blur(1px)' : 'blur(0px)',
                    }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ delay: index * 0.02, ...ANIMATION.snappy }}
                    className={`relative rounded-2xl border cursor-pointer overflow-hidden transition-shadow duration-300 ${
                      isDragging
                        ? 'ring-2 ring-indigo-300 shadow-2xl'
                        : isSelected
                          ? 'bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-100'
                          : isCompleted
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    draggable={!isCompleted}
                    onDragStart={(e) => onTaskDragStart(e, task)}
                    onDragEnd={onTaskDragEnd}
                    onClick={() => selectTask(task.id)}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    {/* Left accent stripe */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-opacity"
                      style={{ backgroundColor: accentColor, opacity: isCompleted ? 0.3 : 1 }}
                    />

                    <div className="pl-4 pr-3 py-3">
                      <div className="flex items-start gap-2.5">

                        {/* Drag grip (visible on hover) */}
                        <motion.div
                          className="mt-1 shrink-0 cursor-grab active:cursor-grabbing"
                          animate={{ opacity: isHovered && !isCompleted ? 0.6 : 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <GripVertical size={13} className="text-gray-400" />
                        </motion.div>

                        {/* Completion checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTask(task.id, { status: isCompleted ? 'next' : 'done' });
                          }}
                          className="mt-0.5 shrink-0"
                        >
                          <motion.div
                            whileTap={{ scale: 0.8 }}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              isCompleted
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-gray-300 hover:border-indigo-400'
                            }`}
                          >
                            {isCompleted && <Check size={11} className="text-white" strokeWidth={3} />}
                          </motion.div>
                        </button>

                        {/* Task content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-snug ${
                            isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}>
                            {task.title}
                          </p>

                          {/* Metadata badges */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {task.project && (() => {
                              const proj = projects.find(p => p.id === task.project);
                              return proj ? (
                                <span
                                  className="text-white px-1.5 py-0.5 rounded-md text-xs font-bold"
                                  style={{ backgroundColor: proj.color, fontSize: 10 }}
                                >
                                  {proj.title}
                                </span>
                              ) : null;
                            })()}

                            {task.energy && <EnergyBadge energyId={task.energy} size="small" />}

                            {task.timeEst && !isDetailExpanded && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Clock size={9} />{task.timeEst}m
                              </span>
                            )}

                            {task.subtasks.length > 0 && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                                {completedSubs}/{task.subtasks.length}
                              </span>
                            )}

                            {scheduledEvent && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-600">
                                <Calendar size={9} />{formatHour(scheduledEvent.startHour)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right-side indicators */}
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          {task.priority && <Star size={12} className="text-amber-400 fill-amber-400" />}
                          {task.dueDate && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                          <motion.div
                            animate={{
                              opacity: isHovered || isSelected ? 1 : 0,
                              x: isHovered || isSelected ? 0 : -6,
                            }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          >
                            <ChevronRight size={14} className={isSelected ? 'text-indigo-500' : 'text-gray-300'} />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty state */}
              {todaySuggestedTasks.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Sun size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">No tasks for today</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Divider between task list and detail panel */}
        <AnimatePresence>
          {isDetailExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 1, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full bg-gray-200 shrink-0"
            />
          )}
        </AnimatePresence>

        {/* Right: Task detail panel (slides in when a task is selected) */}
        <AnimatePresence mode="wait">
          {isDetailExpanded && selectedTask && (
            <motion.div
              key={selectedTask.id}
              initial={{ opacity: 0, x: 80, flex: '0 0 0px' }}
              animate={{ opacity: 1, x: 0, flex: '1 1 auto' }}
              exit={{ opacity: 0, x: 80, flex: '0 0 0px' }}
              transition={ANIMATION.gentle}
              className="h-full bg-white overflow-hidden"
            >
              {renderTaskDetailPanel()}
            </motion.div>
          )}
        </AnimatePresence>

        
      </div>

      {/* Drop feedback toast */}
      <AnimatePresence>
        {dropFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-8 left-1/2 z-50"
          >
            <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-sm ${
              dropFeedback.type === 'scheduled'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-orange-50 border-orange-200 text-orange-700'
            }`}>
              {dropFeedback.type === 'scheduled' ? <Link2 size={15} /> : <Unlink size={15} />}
              <span className="text-sm font-semibold">
                {dropFeedback.type === 'scheduled'
                  ? `"${dropFeedback.taskTitle}" scheduled at ${formatHour(dropFeedback.hour)}`
                  : `"${dropFeedback.taskTitle}" unscheduled`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );


  /* ═══════════════════════════════════════════
     TASK ROW COMPONENT (used in list views)
     ═══════════════════════════════════════════ */

  const TaskRow = ({ task, showProject = true }) => {
    const isDone = task.status === 'done';
    const completedSubs = task.subtasks.filter(s => s.done).length;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={ANIMATION.snappy}
        className={`flex items-start gap-3 py-3 px-3 rounded-xl cursor-pointer group transition-colors duration-200 ${
          selectedTaskId === task.id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
        }`}
        onClick={() => selectTask(task.id)}
      >
        {/* Completion checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateTask(task.id, { status: isDone ? 'next' : 'done' });
          }}
          className="mt-0.5 shrink-0"
        >
          {isDone ? (
            <div className="w-5 h-5 rounded-full border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center">
              <Check size={11} className="text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-gray-400 transition-colors" />
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.context && <ContextBadge contextId={task.context} />}
            {task.energy && <EnergyBadge energyId={task.energy} />}

            {task.timeEst && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Clock size={10} />{task.timeEst}m
              </span>
            )}

            {task.dueDate && (
              <span className="text-xs text-rose-400 font-medium">{task.dueDate}</span>
            )}

            {showProject && task.project && (() => {
              const proj = projects.find(p => p.id === task.project);
              return proj ? (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md text-white font-medium"
                  style={{ backgroundColor: proj.color, fontSize: 10 }}
                >
                  {proj.title}
                </span>
              ) : null;
            })()}

            {task.subtasks.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                {completedSubs}/{task.subtasks.length}
              </span>
            )}

            {task.delegatedTo && (
              <span className="text-xs text-violet-500 flex items-center gap-0.5">
                <User size={10} />{task.delegatedTo}
              </span>
            )}
          </div>
        </div>

        {task.priority && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0 mt-1" />}
      </motion.div>
    );
  };


  /* ═══════════════════════════════════════════
     OTHER VIEW RENDERERS
     ═══════════════════════════════════════════ */

  // ─── Inbox View ───
  const renderInboxView = () => {
    const items = tasks.filter(t => t.status === 'inbox');

    return (
      <div>
        <SectionHeading title="Inbox" count={items.length} icon={Inbox} />

        {items.length === 0 ? (
          <EmptyState icon={Inbox} title="Inbox Zero!" description="All items processed." />
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {items.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={ANIMATION.snappy}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 group hover:shadow-md transition-shadow"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.createdAt}</p>
                  </div>

                  <button
                    onClick={() => { setProcessingTaskId(task.id); setProcessingStep(0); }}
                    className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-indigo-600 transition-colors"
                  >
                    <Brain size={11} />Process
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  // ─── Next Actions View ───
  const renderNextActionsView = () => {
    const filteredTasks = contextFilter === 'all'
      ? nextTasks
      : nextTasks.filter(t => t.context === contextFilter);

    return (
      <div>
        <SectionHeading title="Next Actions" count={nextTasks.length} icon={Zap} />

        {/* Context filter buttons */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          <button
            onClick={() => setContextFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              contextFilter === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            All
          </button>
          {CONTEXTS.map(ctx => {
            const Icon = ctx.icon;
            return (
              <button
                key={ctx.id}
                onClick={() => setContextFilter(ctx.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                  contextFilter === ctx.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                <Icon size={11} />{ctx.label}
              </button>
            );
          })}
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState icon={Zap} title="No actions" description="Change filter or add tasks." />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <AnimatePresence>
              {filteredTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  // ─── Projects View ───
  const renderProjectsView = () => (
    <div>
      <SectionHeading title="Projects" count={projects.length} icon={Folder} />

      <div className="space-y-3">
        {projects.map(project => {
          const projectTasks = tasks.filter(t => t.project === project.id);
          const completedCount = projectTasks.filter(t => t.status === 'done').length;
          const progressPercent = projectTasks.length > 0
            ? Math.round((completedCount / projectTasks.length) * 100)
            : 0;
          const isOpen = selectedProjectId === project.id;

          return (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Project header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedProjectId(isOpen ? null : project.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800">{project.title}</h3>
                    <p className="text-xs text-gray-400">{project.desc}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{progressPercent}%</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown size={16} className="text-gray-400" />
                  </motion.div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
                  <motion.div
                    animate={{ width: `${progressPercent}%` }}
                    transition={ANIMATION.smooth}
                    className="h-full rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                </div>
              </div>

              {/* Expandable task list */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-gray-100 p-2 overflow-hidden"
                  >
                    {projectTasks.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No tasks yet.</p>
                    ) : (
                      projectTasks.map(task => (
                        <TaskRow key={task.id} task={task} showProject={false} />
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Waiting For View ───
  const renderWaitingView = () => (
    <div>
      <SectionHeading title="Waiting For" count={waitingTasks.length} icon={Clock} />
      {waitingTasks.length === 0 ? (
        <EmptyState icon={Clock} title="Nothing pending" description="No delegated tasks." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {waitingTasks.map(task => <TaskRow key={task.id} task={task} />)}
        </div>
      )}
    </div>
  );

  // ─── Someday / Maybe View ───
  const renderSomedayView = () => (
    <div>
      <SectionHeading title="Someday / Maybe" count={somedayTasks.length} icon={Lightbulb} />
      {somedayTasks.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No ideas" description="Capture for later." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {somedayTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 group hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => selectTask(task.id)}
            >
              <Lightbulb size={15} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{task.title}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, {
                    status: 'next',
                    context: suggestContext(task.title),
                    energy: suggestEnergy(task.title),
                    timeEst: 30,
                  });
                }}
                className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg flex items-center gap-1 transition-opacity"
              >
                <ArrowRight size={10} />Activate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Calendar View ───
  const renderCalendarView = () => (
    <div>
      <SectionHeading title="Calendar" icon={Calendar} />
      <p className="text-sm text-gray-400 mb-4">
        Drag tasks here to schedule · Click empty slots to add events
      </p>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {renderTimeline(calendarTimelineRef, 520)}
      </div>
    </div>
  );

  // ─── Weekly Review View ───
  const renderWeeklyReviewView = () => {
    const completedSteps = reviewStepChecks.filter(Boolean).length;

    return (
      <div>
        <SectionHeading title="Weekly Review" icon={RefreshCw} />

        {/* Stats cards */}
        <div className="flex gap-3 mb-6">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 text-white flex-1">
            <p className="text-xs font-bold uppercase opacity-80">Streak</p>
            <p className="text-2xl font-extrabold mt-1">3 weeks 🔥</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
            <p className="text-xs font-bold uppercase text-gray-400">Stats</p>
            <div className="flex gap-4 mt-1.5">
              <div>
                <p className="text-lg font-bold text-gray-800">{inboxTasks.length}</p>
                <p className="text-xs text-gray-400">Inbox</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{nextTasks.length}</p>
                <p className="text-xs text-gray-400">Actions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Review checklist */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Progress header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                animate={{ width: `${(completedSteps / 5) * 100}%` }}
                transition={ANIMATION.smooth}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
            <span className="text-xs font-semibold text-gray-500">{completedSteps}/5</span>
          </div>

          {/* Review steps */}
          {WEEKLY_REVIEW_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div
                key={index}
                className={`flex items-start gap-3 px-4 py-4 border-b border-gray-50 cursor-pointer transition-colors ${
                  reviewStepIndex === index ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setReviewStepIndex(index)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReviewStepChecks(prev => {
                      const next = [...prev];
                      next[index] = !next[index];
                      return next;
                    });
                  }}
                >
                  {reviewStepChecks[index] ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={13} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <StepIcon size={14} className="text-gray-400" />
                    <h3 className={`text-sm font-bold ${
                      reviewStepChecks[index] ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /** Map of view ID → render function (for non-Today views) */
  const viewRenderers = {
    inbox:    renderInboxView,
    next:     renderNextActionsView,
    projects: renderProjectsView,
    waiting:  renderWaitingView,
    someday:  renderSomedayView,
    calendar: renderCalendarView,
    review:   renderWeeklyReviewView,
  };


  /* ═══════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════ */

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}
    >
      <style>{HIDE_SCROLLBAR_CSS}</style>

      {/* ═══ SIDEBAR NAVIGATION ═══ */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 56 : 220 }}
        transition={ANIMATION.gentle}
        className="bg-gray-900 flex flex-col shrink-0 z-40 overflow-hidden"
      >
        {/* App logo and collapse toggle */}
        <div className="p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg">
            <Target size={14} className="text-white" />
          </div>

          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="text-white font-extrabold text-sm tracking-tight whitespace-nowrap"
              >
                FlowMind GTD
              </motion.span>
            )}
          </AnimatePresence>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto text-gray-500 hover:text-white shrink-0 transition-colors"
          >
            <motion.div
              animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChevronRight size={15} />
            </motion.div>
          </button>
        </div>

        {/* Navigation links */}
        <div className="px-2 flex-1 overflow-y-auto hide-scroll mt-1">
          {NAVIGATION_VIEWS.map(navItem => {
            const NavIcon = navItem.icon;
            const isActive = currentView === navItem.id;
            const badgeCount = navItem.id === 'inbox'
              ? inboxTasks.length
              : navItem.id === 'waiting'
                ? waitingTasks.length
                : null;

            return (
              <motion.button
                key={navItem.id}
                onClick={() => {
                  setCurrentView(navItem.id);
                  if (navItem.id !== 'today') setSelectedTaskId(null);
                }}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <NavIcon size={17} className="shrink-0" />

                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex items-center justify-between min-w-0 overflow-hidden"
                    >
                      <span className="text-sm font-medium truncate">{navItem.label}</span>
                      {badgeCount > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
                          isActive ? 'bg-white bg-opacity-20' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {badgeCount}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* User profile (bottom of sidebar) */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="p-3 border-t border-gray-800"
            >
              <div className="flex items-center gap-2.5 px-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  JD
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">John Doe</p>
                  <p className="text-xs text-gray-500 truncate">john@example.com</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      {currentView === 'today' ? (
        renderTodayView()
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Center content */}
          <div className="flex-1 overflow-y-auto hide-scroll">
            <div className="max-w-3xl mx-auto p-6 pb-24">
              <div className="flex items-center justify-end gap-2 mb-5">
                <button
                  onClick={() => setShowCaptureModal(true)}
                  className="px-3.5 py-2 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 flex items-center gap-1.5 shadow-md shadow-indigo-200 transition-colors"
                >
                  <Plus size={14} />Add Task
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {viewRenderers[currentView]?.()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right panel: task detail (for non-Today views) */}
          <AnimatePresence>
            {selectedTask && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={ANIMATION.gentle}
                className="shrink-0 overflow-hidden bg-white border-l border-gray-200"
              >
                <div style={{ width: 360 }} className="h-full">
                  {renderTaskDetailPanel()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ FLOATING ACTION BUTTON ═══ */}
      <AnimatePresence>
        {!showCaptureModal && currentView !== 'today' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={ANIMATION.snappy}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowCaptureModal(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-2xl flex items-center justify-center z-50"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══ QUICK CAPTURE MODAL ═══ */}
      <AnimatePresence>
        {showCaptureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center pt-32 z-50 backdrop-blur-sm"
            onClick={() => setShowCaptureModal(false)}
          >
            <motion.div
              initial={{ y: -30, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Brain size={18} className="text-indigo-500" />
                <h3 className="text-base font-bold text-gray-800">Quick Capture</h3>
                <span className="text-xs text-gray-400 ml-auto">N</span>
              </div>

              <input
                ref={captureInputRef}
                value={captureInput}
                onChange={(e) => setCaptureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCapture();
                  if (e.key === 'Escape') setShowCaptureModal(false);
                }}
                placeholder="What's on your mind?..."
                className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors"
              />

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">Goes to Inbox</p>
                <button
                  onClick={handleCapture}
                  className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <Send size={13} />Capture
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ INBOX PROCESSING WIZARD MODAL ═══ */}
      <AnimatePresence>
        {processingTaskId && (() => {
          const taskBeingProcessed = tasks.find(t => t.id === processingTaskId);
          if (!taskBeingProcessed) return null;

          return (
            <motion.div
              key="processing-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm"
              onClick={() => { setProcessingTaskId(null); setProcessingStep(0); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={18} className="text-indigo-500" />
                  <h3 className="text-base font-bold text-gray-800">Process Item</h3>
                  <button
                    onClick={() => { setProcessingTaskId(null); setProcessingStep(0); }}
                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Task being processed */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-sm font-semibold text-gray-700">{taskBeingProcessed.title}</p>
                </div>

                {/* Wizard steps */}
                <AnimatePresence mode="wait">

                  {/* Step 0: Choose action */}
                  {processingStep === 0 && (
                    <motion.div
                      key="step-choose"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <p className="text-sm text-gray-600 font-semibold mb-3">Is this actionable?</p>

                      {[
                        { action: 'next',    icon: Zap,       iconClasses: 'bg-emerald-100 text-emerald-600', title: 'Yes — Next Action', desc: "I'll do this" },
                        { action: 'waiting', icon: User,      iconClasses: 'bg-violet-100 text-violet-600',   title: 'Delegate',          desc: 'Someone else' },
                        { action: 'someday', icon: Lightbulb, iconClasses: 'bg-sky-100 text-sky-600',         title: 'Someday/Maybe',     desc: 'Save for later' },
                        { action: 'delete',  icon: Trash2,    iconClasses: 'bg-red-100 text-red-600',         title: 'Delete',            desc: 'Remove' },
                      ].map(option => {
                        const OptionIcon = option.icon;
                        return (
                          <button
                            key={option.action}
                            onClick={() => handleProcessAction(processingTaskId, option.action)}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-left w-full transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg ${option.iconClasses} flex items-center justify-center`}>
                              <OptionIcon size={15} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-700">{option.title}</p>
                              <p className="text-xs text-gray-400">{option.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* Step 1: Configure as Next Action */}
                  {processingStep === 1 && (
                    <motion.div
                      key="step-configure"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* AI suggestion banner */}
                      <div className="bg-indigo-50 rounded-lg p-2.5 mb-3 flex items-center gap-2">
                        <Sparkles size={12} className="text-indigo-500" />
                        <span className="text-xs text-indigo-600 font-medium">
                          AI: @{suggestContext(taskBeingProcessed.title)}, {suggestEnergy(taskBeingProcessed.title)} energy, ~{suggestTimeEstimate(suggestEnergy(taskBeingProcessed.title))}min
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* Context picker */}
                        <div>
                          <span className="text-xs font-semibold text-gray-500 block mb-1.5">Context</span>
                          <div className="flex flex-wrap gap-1.5">
                            {CONTEXTS.map(ctx => {
                              const CtxIcon = ctx.icon;
                              return (
                                <button
                                  key={ctx.id}
                                  onClick={() => setProcessingContext(ctx.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                    processingContext === ctx.id
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <CtxIcon size={11} />{ctx.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Energy picker */}
                        <div>
                          <span className="text-xs font-semibold text-gray-500 block mb-1.5">Energy</span>
                          <div className="flex gap-1.5">
                            {ENERGY_LEVELS.map(level => {
                              const LevelIcon = level.icon;
                              return (
                                <button
                                  key={level.id}
                                  onClick={() => setProcessingEnergy(level.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                    processingEnergy === level.id
                                      ? `${level.bg} ${level.color}`
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <LevelIcon size={11} />{level.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time estimate picker */}
                        <div>
                          <span className="text-xs font-semibold text-gray-500 block mb-1.5">Time</span>
                          <div className="flex flex-wrap gap-1.5">
                            {TIME_ESTIMATE_OPTIONS.map(minutes => (
                              <button
                                key={minutes}
                                onClick={() => setProcessingTime(minutes)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  processingTime === minutes
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {minutes}m
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Project picker */}
                        <div>
                          <span className="text-xs font-semibold text-gray-500 block mb-1.5">Project</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setProcessingProject(null)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                processingProject === null
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              None
                            </button>
                            {projects.map(proj => (
                              <button
                                key={proj.id}
                                onClick={() => setProcessingProject(proj.id)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={
                                  processingProject === proj.id
                                    ? { backgroundColor: proj.color, color: '#fff' }
                                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                                }
                              >
                                {proj.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Wizard navigation */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setProcessingStep(0)}
                          className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => handleProcessAction(processingTaskId, 'confirm-next')}
                          className="flex-1 px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1 hover:bg-indigo-600 transition-colors"
                        >
                          <Check size={13} />Save
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Delegate (Waiting For) */}
                  {processingStep === 3 && (
                    <motion.div
                      key="step-delegate"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-sm text-gray-600 font-semibold mb-3">Who?</p>

                      <input
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleProcessAction(processingTaskId, 'confirm-waiting');
                        }}
                        placeholder="Person or team..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 mb-3 transition-colors"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => setProcessingStep(0)}
                          className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => handleProcessAction(processingTaskId, 'confirm-waiting')}
                          className="flex-1 px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1 hover:bg-violet-600 transition-colors"
                        >
                          <Check size={13} />Save
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ FOCUS MODE (Fullscreen Pomodoro) ═══ */}
      <AnimatePresence>
        {showFocusMode && (() => {
          const focusedTask = tasks.find(t => t.id === focusTaskId);
          if (!focusedTask) return null;

          return (
            <motion.div
              key="focus-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center p-8"
            >
              {/* Exit button */}
              <button
                onClick={() => { setShowFocusMode(false); setPomodoroRunning(false); }}
                className="absolute top-6 right-6 text-gray-500 hover:text-white text-sm flex items-center gap-2 transition-colors"
              >
                <Minimize2 size={15} />Exit
              </button>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, ...ANIMATION.smooth }}
                className="text-center max-w-lg"
              >
                {/* Task title */}
                <h1 className="text-3xl font-extrabold text-white mb-8">{focusedTask.title}</h1>

                {/* Timer display */}
                <div className="mb-10">
                  <div className="text-6xl font-mono font-bold text-white mb-4 tabular-nums">
                    {formatTimer(pomodoroSeconds)}
                  </div>

                  {/* Timer controls */}
                  <div className="flex items-center justify-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setPomodoroRunning(!pomodoroRunning)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${
                        pomodoroRunning ? 'bg-gray-700' : 'bg-indigo-500'
                      }`}
                    >
                      {pomodoroRunning ? <Pause size={22} /> : <Play size={22} />}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setPomodoroRunning(false);
                        setPomodoroSeconds(pomodoroMode === 'work' ? 1500 : 300);
                      }}
                      className="w-12 h-12 rounded-2xl bg-gray-800 text-gray-400 flex items-center justify-center"
                    >
                      <RotateCcw size={17} />
                    </motion.button>
                  </div>

                  {/* Mode toggle (Focus / Break) */}
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => { setPomodoroMode('work'); setPomodoroRunning(false); setPomodoroSeconds(1500); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        pomodoroMode === 'work' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      Focus 25m
                    </button>
                    <button
                      onClick={() => { setPomodoroMode('break'); setPomodoroRunning(false); setPomodoroSeconds(300); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        pomodoroMode === 'break' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      Break 5m
                    </button>
                  </div>
                </div>

                {/* Subtask checklist (in focus mode) */}
                {focusedTask.subtasks.length > 0 && (
                  <div className="bg-gray-900 rounded-2xl p-5 text-left border border-gray-800 max-w-sm mx-auto">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Subtasks</p>
                    {focusedTask.subtasks.map(subtask => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2.5 py-1.5 cursor-pointer"
                        onClick={() =>
                          updateTask(focusedTask.id, {
                            subtasks: focusedTask.subtasks.map(s =>
                              s.id === subtask.id ? { ...s, done: !s.done } : s
                            ),
                          })
                        }
                      >
                        {subtask.done ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                        )}
                        <span className={`text-sm transition-colors ${
                          subtask.done ? 'line-through text-gray-500' : 'text-gray-200'
                        }`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Complete task button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    updateTask(focusedTask.id, { status: 'done' });
                    setShowFocusMode(false);
                    setPomodoroRunning(false);
                  }}
                  className="mt-8 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 flex items-center gap-2 mx-auto shadow-lg transition-colors"
                >
                  <CheckCircle size={17} />Complete
                </motion.button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}