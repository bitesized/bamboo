'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

export type CalendarBar = {
  entryId: string;
  bookId: string;
  title: string;
  coverUrl: string | null;
  status: 'READ' | 'READING';
  startedAt: string | null;
  finishedAt: string | null;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LANE_H = 24;   // px per lane
const BAR_H = 20;    // bar height within lane
const BARS_PAD_TOP = 3;
const BARS_PAD_BOT = 5;

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function monWeekday(d: Date): number {
  return (d.getDay() + 6) % 7; // Mon=0 … Sun=6
}

function localDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// FNV-1a hash → stable hue in 30–330 range (avoids harsh reds at 0°/360°)
function entryHue(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 300) + 30;
}

interface BarStyle { bg: string; fg: string }

function barStyle(entryId: string, reading: boolean, dark: boolean): BarStyle {
  const h = entryHue(entryId);
  if (dark) {
    return reading
      ? { bg: `hsl(${h} 22% 28%)`, fg: `hsl(${h} 40% 72%)` }
      : { bg: `hsl(${h} 48% 40%)`, fg: `hsl(${h} 60% 92%)` };
  }
  return reading
    ? { bg: `hsl(${h} 35% 91%)`, fg: `hsl(${h} 55% 30%)` }
    : { bg: `hsl(${h} 60% 72%)`, fg: `hsl(${h} 65% 14%)` };
}

// Reads dark-mode state from the html.dark class (matches ThemeProvider)
function useIsDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ── Data model ─────────────────────────────────────────────────────────────

interface Resolved { bar: CalendarBar; start: Date; end: Date }

function resolveBar(bar: CalendarBar, today: Date): Resolved | null {
  if (bar.status === 'READ') {
    if (!bar.finishedAt) return null;
    const end = localDate(bar.finishedAt);
    const start = bar.startedAt ? localDate(bar.startedAt) : end;
    if (start > end) return null;
    return { bar, start, end };
  }
  if (!bar.startedAt) return null;
  const start = localDate(bar.startedAt);
  if (start > today) return null;
  return { bar, start, end: today };
}

interface WeekBar {
  resolved: Resolved;
  startCol: number;
  endCol: number;
  startsHere: boolean;
  endsHere: boolean;
  lane: number;
}

function buildWeekBars(resolved: Resolved[], days: Date[]): WeekBar[] {
  const ws = days[0];
  const we = days[6];
  const raw: Omit<WeekBar, 'lane'>[] = [];

  for (const r of resolved) {
    if (r.end < ws || r.start > we) continue;
    const cs = r.start < ws ? ws : r.start;
    const ce = r.end > we ? we : r.end;
    raw.push({
      resolved: r,
      startCol: monWeekday(cs),
      endCol: monWeekday(ce),
      startsHere: r.start >= ws,
      endsHere: r.end <= we,
    });
  }

  raw.sort((a, b) => a.startCol - b.startCol);

  const laneEnds: number[] = [];
  return raw.map(wb => {
    let lane = laneEnds.findIndex(e => e < wb.startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = wb.endCol;
    return { ...wb, lane };
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StatsCalendar({ bars }: { bars: CalendarBar[] }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dark = useIsDark();

  function prevMonth() {
    if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1);
  }
  function nextMonth() {
    if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1);
  }
  function goToday() { setYr(today.getFullYear()); setMo(today.getMonth()); }

  const heading = new Date(yr, mo, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const weeks = useMemo<Date[][]>(() => {
    const first = new Date(yr, mo, 1);
    const last = new Date(yr, mo + 1, 0);
    const grid0 = addDays(first, -monWeekday(first));
    const result: Date[][] = [];
    for (let w = 0; ; w++) {
      const ws = addDays(grid0, w * 7);
      if (ws > last) break;
      result.push(Array.from({ length: 7 }, (_, i) => addDays(ws, i)));
    }
    return result;
  }, [yr, mo]);

  const resolved = useMemo(
    () => bars.map(b => resolveBar(b, today)).filter((r): r is Resolved => r !== null),
    [bars, today],
  );

  // Pre-compute all week bars so we can derive maxLanes before rendering
  const allWeekBars = useMemo(
    () => weeks.map(w => buildWeekBars(resolved, w)),
    [weeks, resolved],
  );

  // First week index (wi) where each entry appears this month — for title placement
  const firstWeekByEntry = useMemo(() => {
    const map: Record<string, number> = {};
    allWeekBars.forEach((wbs, wi) => {
      for (const wb of wbs) {
        const id = wb.resolved.bar.entryId;
        if (!(id in map)) map[id] = wi;
      }
    });
    return map;
  }, [allWeekBars]);

  // Uniform bar-area height across all weeks = max lanes in any week this month
  const maxLanes = useMemo(
    () => Math.max(1, ...allWeekBars.map(wbs => wbs.reduce((m, wb) => Math.max(m, wb.lane + 1), 0))),
    [allWeekBars],
  );
  const barsAreaH = BARS_PAD_TOP + maxLanes * LANE_H + BARS_PAD_BOT;

  const hasData = useMemo(() => {
    if (!weeks.length) return false;
    const ms = weeks[0][0];
    const me = weeks[weeks.length - 1][6];
    return resolved.some(r => r.end >= ms && r.start <= me);
  }, [resolved, weeks]);

  const todayKey = fmtKey(today);

  return (
    <section>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-stone-900 dark:text-stone-100">Reading Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
          >
            ◀
          </button>
          <span className="text-sm text-stone-700 dark:text-stone-300 w-36 text-center">{heading}</span>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
          >
            ▶
          </button>
          <button
            onClick={goToday}
            className="text-xs px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Day-of-week labels ── */}
      <div className="grid grid-cols-7 mb-2 pb-1.5 border-b border-stone-100 dark:border-stone-800">
        {DAYS.map(d => (
          <span key={d} className="text-center text-xs text-stone-400 dark:text-stone-500 select-none">{d}</span>
        ))}
      </div>

      {/* ── Week rows ── */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const wbs = allWeekBars[wi];
          return (
            <div key={wi} className="rounded-lg border border-stone-100 dark:border-stone-800 overflow-hidden">
              {/* Day numbers */}
              <div className="grid grid-cols-7">
                {week.map((day, di) => {
                  const inMonth = day.getMonth() === mo;
                  const isToday = fmtKey(day) === todayKey;
                  return (
                    <div
                      key={di}
                      className={`text-center text-xs py-1.5 select-none ${
                        isToday
                          ? 'font-semibold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800'
                          : inMonth
                          ? 'text-stone-500 dark:text-stone-400'
                          : 'text-stone-300 dark:text-stone-700'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>

              {/* Bar area — fixed uniform height across all weeks */}
              <div className="relative" style={{ height: `${barsAreaH}px` }}>
                {wbs.map(wb => {
                  const reading = wb.resolved.bar.status === 'READING';
                  const { bg, fg } = barStyle(wb.resolved.bar.entryId, reading, dark);
                  const isHovered = hoveredId === wb.resolved.bar.entryId;
                  const isDimmed = hoveredId !== null && !isHovered;

                  const top = BARS_PAD_TOP + wb.lane * LANE_H;
                  const leftPct = (wb.startCol / 7) * 100;
                  const rightPct = ((6 - wb.endCol) / 7) * 100;

                  // Round the caps that actually start/end the reading period
                  const r = '5px';
                  const borderRadius = [
                    wb.startsHere ? r : '0',
                    wb.endsHere && !reading ? r : '0',
                    wb.endsHere && !reading ? r : '0',
                    wb.startsHere ? r : '0',
                  ].join(' ');

                  return (
                    <Link
                      key={wb.resolved.bar.entryId}
                      href={`/books/${wb.resolved.bar.bookId}`}
                      title={wb.resolved.bar.title}
                      onMouseEnter={() => setHoveredId(wb.resolved.bar.entryId)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        position: 'absolute',
                        left: `calc(${leftPct}% + 1px)`,
                        right: `calc(${rightPct}% + 1px)`,
                        top: `${top}px`,
                        height: `${BAR_H}px`,
                        backgroundColor: bg,
                        color: fg,
                        borderRadius,
                        opacity: isDimmed ? 0.25 : 1,
                        transition: 'opacity 120ms ease',
                        zIndex: isHovered ? 2 : 1,
                      }}
                      className="flex items-center px-2 text-[10px] leading-none overflow-hidden whitespace-nowrap"
                    >
                      {firstWeekByEntry[wb.resolved.bar.entryId] === wi && (
                        <span className="truncate font-medium">{wb.resolved.bar.title}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!hasData && (
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-3 text-center">
          Nothing logged in {heading}.
        </p>
      )}
    </section>
  );
}
