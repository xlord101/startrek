"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  startDate: string; // "YYYY-MM-DD" or ""
  endDate: string;   // "YYYY-MM-DD" or ""
  onChange: (range: { startDate: string; endDate: string }) => void;
  label?: string;
  className?: string;
  placeholder?: string;
  align?: "start" | "center" | "end";
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromYMD(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatHumanDate(s: string): string {
  const d = fromYMD(s);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
  placeholder = "Filter by Date Range",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Draft selection state inside modal
  const [draftStart, setDraftStart] = useState<string>(startDate || "");
  const [draftEnd, setDraftEnd] = useState<string>(endDate || "");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Calendar month/year navigation state
  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => toYMD(today), [today]);

  const [viewYear, setViewYear] = useState<number>(() => {
    const d = fromYMD(startDate) || today;
    return d.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const d = fromYMD(startDate) || today;
    return d.getMonth();
  });

  // When opening modal, synchronize drafts to current props
  const handleOpen = () => {
    setDraftStart(startDate || "");
    setDraftEnd(endDate || "");
    setHoveredDate(null);
    const d = fromYMD(startDate) || fromYMD(endDate) || today;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Day click logic for single/range selection
  const handleDayClick = (ymd: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      // Step 1: Start fresh selection
      setDraftStart(ymd);
      setDraftEnd("");
    } else if (draftStart && !draftEnd) {
      // Step 2: Set end date
      if (ymd < draftStart) {
        // Clicked date is earlier than start: swap so range is always ascending
        setDraftStart(ymd);
        setDraftEnd(draftStart);
      } else {
        setDraftEnd(ymd);
      }
    }
  };

  // Presets
  const applyPreset = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "clear") => {
    if (preset === "clear") {
      setDraftStart("");
      setDraftEnd("");
      return;
    }

    const now = new Date();
    const nowYMD = toYMD(now);

    if (preset === "today") {
      setDraftStart(nowYMD);
      setDraftEnd(nowYMD);
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yYMD = toYMD(y);
      setDraftStart(yYMD);
      setDraftEnd(yYMD);
      setViewYear(y.getFullYear());
      setViewMonth(y.getMonth());
    } else if (preset === "last7") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      const start7 = toYMD(d7);
      setDraftStart(start7);
      setDraftEnd(nowYMD);
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    } else if (preset === "thisMonth") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDraftStart(toYMD(first));
      setDraftEnd(toYMD(last));
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  };

  // Check which preset is active (if any)
  const activePreset = useMemo(() => {
    if (!draftStart && !draftEnd) return "clear";
    const now = new Date();
    const nowYMD = toYMD(now);
    if (draftStart === nowYMD && draftEnd === nowYMD) return "today";
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yYMD = toYMD(y);
    if (draftStart === yYMD && draftEnd === yYMD) return "yesterday";
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    if (draftStart === toYMD(d7) && draftEnd === nowYMD) return "last7";
    const first = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const last = toYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    if (draftStart === first && draftEnd === last) return "thisMonth";
    return null;
  }, [draftStart, draftEnd]);

  // Done / Apply
  const handleApply = () => {
    let finalStart = draftStart;
    let finalEnd = draftEnd;

    // If user selected only a start date, treat it as a single-day filter
    if (finalStart && !finalEnd) {
      finalEnd = finalStart;
    }

    if (finalStart && finalEnd && finalStart > finalEnd) {
      const tmp = finalStart;
      finalStart = finalEnd;
      finalEnd = tmp;
    }

    onChange({ startDate: finalStart, endDate: finalEnd });
    setIsOpen(false);
  };

  // Clear directly from trigger button
  const handleDirectClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ startDate: "", endDate: "" });
  };

  // Compute calendar grid days
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday
    const startOffset = (dayOfWeek + 6) % 7; // 0 for Monday, 6 for Sunday

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      ymd: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Prev month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      const ymd = toYMD(prevDate);
      cells.push({
        ymd,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: ymd === todayYMD,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(viewYear, viewMonth, d);
      const ymd = toYMD(currDate);
      cells.push({
        ymd,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: ymd === todayYMD,
      });
    }

    // Next month leading days to complete grid rows
    const totalSoFar = cells.length;
    const remaining = (7 - (totalSoFar % 7)) % 7;
    // ensure at least 35 or 42 cells so grid doesn't jump
    const extraRows = totalSoFar + remaining < 35 ? remaining + 7 : remaining;
    for (let d = 1; d <= extraRows; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const ymd = toYMD(nextDate);
      cells.push({
        ymd,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: ymd === todayYMD,
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayYMD]);

  // Compute effective start and end including preview hover
  const effectiveStart = draftStart;
  const effectiveEnd = draftEnd || (hoveredDate && draftStart ? hoveredDate : "");
  const [sortedStart, sortedEnd] = useMemo(() => {
    if (!effectiveStart) return ["", ""];
    if (!effectiveEnd) return [effectiveStart, effectiveStart];
    return effectiveStart <= effectiveEnd
      ? [effectiveStart, effectiveEnd]
      : [effectiveEnd, effectiveStart];
  }, [effectiveStart, effectiveEnd]);

  // Year options for dropdown (past 2 years to future 2 years)
  const yearOptions = useMemo(() => {
    const cy = today.getFullYear();
    const years: number[] = [];
    for (let y = cy - 3; y <= cy + 3; y++) {
      years.push(y);
    }
    return years;
  }, [today]);

  const hasActiveFilter = Boolean(startDate || endDate);

  // Formatted trigger text
  const triggerText = useMemo(() => {
    if (!startDate && !endDate) {
      return placeholder;
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatHumanDate(startDate);
      }
      return `${formatHumanDate(startDate)} – ${formatHumanDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatHumanDate(startDate)}`;
    }
    return `Until ${formatHumanDate(endDate)}`;
  }, [startDate, endDate, placeholder]);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center justify-between gap-2 h-10 px-3.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs select-none",
          hasActiveFilter
            ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon
            className={cn(
              "w-4 h-4 flex-shrink-0",
              hasActiveFilter ? "text-emerald-600" : "text-slate-400"
            )}
          />
          <span className="truncate">{triggerText}</span>
        </span>

        <span className="flex items-center gap-1 flex-shrink-0">
          {hasActiveFilter && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleDirectClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDirectClear(e as any);
                }
              }}
              title="Clear date filter"
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </span>
      </button>

      {/* Unified Single Calendar Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md w-full bg-white border-slate-200 shadow-2xl rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 font-heading">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                Select Date Range
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500">
              {!draftStart && !draftEnd && (
                <span>Tap a start date on the calendar, then tap an end date.</span>
              )}
              {draftStart && !draftEnd && (
                <span className="text-emerald-700 font-semibold">
                  Start: {formatHumanDate(draftStart)} &rarr; Now tap an end date (or press Done for 1 day).
                </span>
              )}
              {draftStart && draftEnd && (
                <span className="text-emerald-700 font-semibold">
                  Selected: {formatHumanDate(draftStart)} {draftStart !== draftEnd && `– ${formatHumanDate(draftEnd)}`}
                </span>
              )}
            </p>
          </DialogHeader>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors",
                activePreset === "today"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("yesterday")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors",
                activePreset === "yesterday"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last7")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors",
                activePreset === "last7"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisMonth")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors",
                activePreset === "thisMonth"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("clear")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors",
                activePreset === "clear"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All Time
            </button>
          </div>

          {/* Month / Year Header */}
          <div className="flex items-center justify-between pt-2 pb-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-800 py-1 px-1.5 rounded-md border border-slate-200 cursor-pointer focus:outline-emerald-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-800 py-1 px-1.5 rounded-md border border-slate-200 cursor-pointer focus:outline-emerald-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleJumpToToday}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 transition-colors ml-1"
                title="Jump to today"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center">
            {WEEK_DAYS.map((wd) => (
              <span
                key={wd}
                className="text-[11px] font-bold text-slate-400 uppercase py-1"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarCells.map((cell) => {
              const isStart = cell.ymd === sortedStart;
              const isEnd = cell.ymd === sortedEnd;
              const isRangeSelected = Boolean(sortedStart && sortedEnd);
              const isSingleDay = sortedStart === sortedEnd;
              const isInRange =
                isRangeSelected && cell.ymd > sortedStart && cell.ymd < sortedEnd;

              return (
                <div
                  key={cell.ymd}
                  className="relative h-10 flex items-center justify-center"
                  onMouseEnter={() => {
                    if (draftStart && !draftEnd) {
                      setHoveredDate(cell.ymd);
                    }
                  }}
                >
                  {/* Range Connector Backgrounds */}
                  {isRangeSelected && !isSingleDay && (
                    <>
                      {/* Full in-between day background */}
                      {isInRange && (
                        <div className="absolute inset-y-1 inset-x-0 bg-emerald-100/80" />
                      )}
                      {/* Left half connector for end day */}
                      {isEnd && (
                        <div className="absolute inset-y-1 left-0 right-1/2 bg-emerald-100/80" />
                      )}
                      {/* Right half connector for start day */}
                      {isStart && (
                        <div className="absolute inset-y-1 right-0 left-1/2 bg-emerald-100/80" />
                      )}
                    </>
                  )}

                  {/* Day Button */}
                  <button
                    type="button"
                    onClick={() => handleDayClick(cell.ymd)}
                    className={cn(
                      "relative z-10 w-8.5 h-8.5 flex items-center justify-center rounded-full text-xs font-semibold transition-all select-none",
                      // Start or End date styling
                      isStart || isEnd
                        ? "bg-emerald-600 text-white font-bold shadow-xs scale-105"
                        : isInRange
                        ? "text-emerald-950 font-bold hover:bg-emerald-200"
                        : cell.isToday
                        ? "border border-emerald-500 text-emerald-700 font-bold bg-emerald-50/50 hover:bg-emerald-100/60"
                        : cell.isCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selection Preview Card */}
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Start Date
              </span>
              <span className="font-bold text-slate-900">
                {draftStart ? formatHumanDate(draftStart) : "Not selected"}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                End Date
              </span>
              <span className="font-bold text-slate-900">
                {draftEnd
                  ? formatHumanDate(draftEnd)
                  : draftStart
                  ? `${formatHumanDate(draftStart)} (Same day)`
                  : "Not selected"}
              </span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraftStart("");
                setDraftEnd("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 font-bold px-2.5 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs h-9 font-bold border-slate-200 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl shadow-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

