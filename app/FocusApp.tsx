"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Mode = "focus" | "short" | "long";
type Task = { id: string; text: string; done: boolean };
type Stats = { date: string; minutes: number; sessions: number; tasks: number };

const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const MODE_LABEL: Record<Mode, string> = { focus: "专注", short: "短休", long: "长休" };
const STORE = { tasks: "cat-focus-tasks", stats: "cat-focus-stats", selected: "cat-focus-selected" };

function today() { return new Date().toISOString().slice(0, 10); }
function formatTime(total: number) {
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function FocusApp() {
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState<Stats>({ date: today(), minutes: 0, sessions: 0, tasks: 0 });
  const [hydrated, setHydrated] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedId), [tasks, selectedId]);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        const storedTasks = JSON.parse(localStorage.getItem(STORE.tasks) || "[]") as Task[];
        const storedStats = JSON.parse(localStorage.getItem(STORE.stats) || "null") as Stats | null;
        setTasks(storedTasks);
        setStats(storedStats?.date === today() ? storedStats : { date: today(), minutes: 0, sessions: 0, tasks: 0 });
        setSelectedId(localStorage.getItem(STORE.selected));
      } catch { /* malformed local data should not stop the timer */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(STORE.tasks, JSON.stringify(tasks)); }, [tasks, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(STORE.stats, JSON.stringify(stats)); }, [stats, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (selectedId) localStorage.setItem(STORE.selected, selectedId); else localStorage.removeItem(STORE.selected);
  }, [selectedId, hydrated]);

  useEffect(() => {
    document.title = running ? `${formatTime(secondsLeft)} · ${MODE_LABEL[mode]}｜猫猫专注屋` : "猫猫专注屋｜陪你慢慢做好一件事";
  }, [running, secondsLeft, mode]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;
        setRunning(false);
        if (mode === "focus") setStats((value) => ({ ...value, date: today(), minutes: value.minutes + 25, sessions: value.sessions + 1 }));
        try {
          audioRef.current ??= new AudioContext();
          const oscillator = audioRef.current.createOscillator();
          const gain = audioRef.current.createGain();
          oscillator.frequency.value = 660; gain.gain.value = 0.06;
          oscillator.connect(gain); gain.connect(audioRef.current.destination);
          oscillator.start(); oscillator.stop(audioRef.current.currentTime + 0.35);
        } catch { /* sound is a bonus */ }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode]);

  function chooseMode(next: Mode) { setMode(next); setRunning(false); setSecondsLeft(DURATIONS[next]); }
  function resetTimer() { setRunning(false); setSecondsLeft(DURATIONS[mode]); }
  function toggleTimer() {
    if (secondsLeft === 0) setSecondsLeft(DURATIONS[mode]);
    setRunning((value) => !value);
  }
  function addTask(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim(); if (!text) return;
    const task = { id: crypto.randomUUID(), text, done: false };
    setTasks((items) => [...items, task]); setSelectedId(task.id); setDraft("");
  }
  function toggleTask(id: string) {
    setTasks((items) => items.map((task) => {
      if (task.id !== id) return task;
      if (!task.done) setStats((value) => ({ ...value, date: today(), tasks: value.tasks + 1 }));
      else setStats((value) => ({ ...value, date: today(), tasks: Math.max(0, value.tasks - 1) }));
      return { ...task, done: !task.done };
    }));
  }
  function removeTask(id: string) { setTasks((items) => items.filter((task) => task.id !== id)); if (selectedId === id) setSelectedId(null); }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="猫猫专注屋首页"><span className="brand-mark">喵</span><span>猫猫专注屋</span></a>
        <span className="local-note"><i /> 数据只留在你的浏览器</span>
      </header>
      <section className="hero" id="top">
        <div className="intro"><span className="eyebrow">今天，也一起慢慢做好一件事</span><h1>专注的时候，<br /><em>猫猫陪着你。</em></h1><p>一只不会催你的白猫，一枚刚刚好的番茄钟。把想做的事写下来，然后安心开始。</p></div>
        <section className="timer-card" aria-label="专注计时器">
          <div className="mode-tabs" role="tablist" aria-label="计时模式">
            {(["focus", "short", "long"] as Mode[]).map((item) => <button key={item} className={mode === item ? "active" : ""} onClick={() => chooseMode(item)} type="button" role="tab" aria-selected={mode === item}>{MODE_LABEL[item]}</button>)}
          </div>
          <div className="timer-body">
            <div className="clock"><span className="clock-label">{mode === "focus" ? "FOCUS TIME" : "REST TIME"}</span><strong aria-live="polite">{formatTime(secondsLeft)}</strong><span className="clock-task">{selectedTask ? selectedTask.text : mode === "focus" ? "准备好就开始吧" : "休息一下，伸个懒腰"}</span></div>
            <div className="cat-stage"><Image className={`cat-illustration ${mode !== "focus" ? "resting" : ""} ${running ? "active" : ""}`} src="/cat-focus.png" width={1536} height={1024} priority alt={mode === "focus" ? "白猫躺在粉色软垫上安静陪伴" : "白猫在粉色软垫上休息伸懒腰"} /></div>
          </div>
          <div className="timer-actions"><button className="start-button" onClick={toggleTimer} type="button"><span>{running ? "Ⅱ" : "▶"}</span>{running ? "暂停一下" : secondsLeft === 0 ? "再来一轮" : mode === "focus" ? "开始专注" : "开始休息"}</button><button className="round-button" onClick={resetTimer} type="button" aria-label="重置计时器">↻</button></div>
        </section>
      </section>
      <section className="summary-strip" aria-label="今日概览"><div><span>今日专注</span><strong>{stats.minutes} <small>分钟</small></strong></div><div><span>完成番茄</span><strong>{stats.sessions} <small>个</small></strong></div><div><span>完成任务</span><strong>{stats.tasks} <small>件</small></strong></div><p>先完成一个小目标，<br />再去接住更大的灵感。</p></section>
      <section className="tasks-section" aria-labelledby="tasks-title">
        <div className="tasks-heading"><div><span className="section-kicker">TODAY&apos;S LITTLE STEPS</span><h2 id="tasks-title">今天想完成什么？</h2></div><span>{tasks.filter((task) => task.done).length} / {tasks.length} 已完成</span></div>
        <form className="task-form" onSubmit={addTask}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="写下一件具体的小事…" aria-label="新任务" maxLength={80} /><button type="submit">＋ 添加</button></form>
        <div className="task-list">
          {tasks.length === 0 ? <div className="empty-state"><span>♡</span><p>清单还是空的。<br />试试从一件 25 分钟能完成的小事开始。</p></div> : tasks.map((task) => (
            <article className={`task-row ${task.done ? "done" : ""} ${selectedId === task.id ? "selected" : ""}`} key={task.id}>
              <button className="check-button" onClick={() => toggleTask(task.id)} aria-label={task.done ? `取消完成：${task.text}` : `完成：${task.text}`} type="button">{task.done ? "✓" : ""}</button>
              <button className="task-name" onClick={() => setSelectedId(task.id)} type="button"><span>{task.text}</span><small>{selectedId === task.id ? "当前专注" : "设为当前任务"}</small></button>
              <button className="delete-button" onClick={() => removeTask(task.id)} type="button" aria-label={`删除：${task.text}`}>×</button>
            </article>
          ))}
        </div>
      </section>
      <footer><span>猫猫不催你，猫猫只陪你。</span><span>本地存储 · 无需登录 · 免费使用</span></footer>
    </main>
  );
}
