"use client";

import { useId, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";

const todayMYT = () =>
  new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const localDate = (value: string) => new Date(`${value}T12:00:00`);
const dateLabel = (value: string) =>
  value
    ? new Intl.DateTimeFormat("en-MY", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(localDate(value))
    : "Choose a date";
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

type FieldProps = {
  name: string;
  label: string;
  timeLabel?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
};

function DateControl({
  id,
  value,
  onChange,
  label,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState((value || todayMYT()).slice(0, 7));
  const panelId = useId();
  const center = localDate(`${month}-01`);
  const gridStart = new Date(center);
  gridStart.setDate(1 - center.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  function moveMonth(offset: number) {
    const next = new Date(center);
    next.setMonth(next.getMonth() + offset);
    setMonth(isoDay(next).slice(0, 7));
  }
  return (
    <div
      className="date-control"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          event.stopPropagation();
          setExpanded(false);
        }
      }}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="date-control-trigger"
        onClick={() => {
          if (!expanded) setMonth((value || todayMYT()).slice(0, 7));
          setExpanded(!expanded);
        }}
      >
        <CalendarDays size={21} aria-hidden="true" />
        <span>{dateLabel(value)}</span>
        <ChevronDown size={18} className={expanded ? "rotate-180" : ""} aria-hidden="true" />
      </button>
      {expanded && (
        <div
          id={panelId}
          className="date-control-calendar"
          role="group"
          aria-label={`${label} calendar`}
        >
          <div className="flex items-center justify-between gap-2 pb-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
              className="calendar-nav-button"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <strong>
              {new Intl.DateTimeFormat("en-MY", {
                month: "long",
                year: "numeric",
              }).format(center)}
            </strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => moveMonth(1)}
              className="calendar-nav-button"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="date-control-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="calendar-weekday" aria-hidden="true">
                {day[0]}
              </span>
            ))}
            {days.map((day) => {
              const iso = isoDay(day);
              return (
                <button
                  type="button"
                  key={iso}
                  aria-label={new Intl.DateTimeFormat("en-MY", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(day)}
                  aria-pressed={iso === value}
                  data-outside={iso.slice(0, 7) !== month || undefined}
                  data-today={iso === todayMYT() || undefined}
                  onClick={() => {
                    onChange(iso);
                    setMonth(iso.slice(0, 7));
                    setExpanded(false);
                  }}
                  className="calendar-day-button"
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <button
              type="button"
              className="min-h-10 px-2 font-medium text-primary"
              onClick={() => {
                onChange(todayMYT());
                setExpanded(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="min-h-10 px-2 text-muted-foreground"
              onClick={() => setExpanded(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DateField({
  name,
  label,
  defaultValue = "",
  required,
  disabled,
}: FieldProps) {
  const controlId = useId();
  const [date, setDate] = useState(
    defaultValue.slice(0, 10) || (required ? todayMYT() : ""),
  );
  return (
    <div className="field-group">
      <label htmlFor={controlId} className="field-label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input type="hidden" name={name} value={date} />
      <DateControl
        id={controlId}
        label={label}
        value={date}
        onChange={setDate}
        disabled={disabled}
      />
      {!required && date && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDate("")}
          className="mt-2 text-sm text-muted-foreground underline"
        >
          Clear date
        </button>
      )}
    </div>
  );
}

function TimeControl({
  id,
  value,
  onChange,
  label,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const [hour, minute] = (value || "09:00").split(":").map(Number);
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";
  function update(h: number, m: number, p: string) {
    onChange(
      `${String((h % 12) + (p === "PM" ? 12 : 0)).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  }
  return (
    <div className="time-control">
      <Clock3 size={21} aria-hidden="true" />
      <select
        id={id}
        aria-label={`${label} hour`}
        value={displayHour}
        disabled={disabled}
        onChange={(e) => update(Number(e.target.value), minute, period)}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        aria-label={`${label} minute`}
        value={minute}
        disabled={disabled}
        onChange={(e) => update(displayHour, Number(e.target.value), period)}
      >
        {Array.from({ length: 60 }, (_, m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} period`}
        value={period}
        disabled={disabled}
        onChange={(e) => update(displayHour, minute, e.target.value)}
      >
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
}

export function TimeField({
  name,
  label,
  defaultValue = "09:00",
  disabled,
}: FieldProps) {
  const controlId = useId();
  const [time, setTime] = useState(defaultValue);
  return (
    <div className="field-group">
      <label htmlFor={controlId} className="field-label">{label}</label>
      <input type="hidden" name={name} value={time} />
      <TimeControl
        id={controlId}
        label={label}
        value={time}
        onChange={setTime}
        disabled={disabled}
      />
    </div>
  );
}

export function DateTimeField({
  name,
  label,
  timeLabel = "Time",
  defaultValue = "",
  required,
  disabled,
}: FieldProps) {
  const dateId = useId();
  const timeId = useId();
  const [date, setDate] = useState(
    defaultValue.slice(0, 10) || (required ? todayMYT() : ""),
  );
  const [time, setTime] = useState(defaultValue.slice(11, 16) || "09:00");
  return (
    <div className="date-time-field">
      <input type="hidden" name={name} value={date ? `${date}T${time}` : ""} />
      <div className="field-group">
        <label htmlFor={dateId} className="field-label">
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        <DateControl
          id={dateId}
          label={label}
          value={date}
          onChange={setDate}
          disabled={disabled}
        />
      </div>
      <div className="field-group">
        <label htmlFor={timeId} className="field-label">
          {timeLabel}{" "}
          <span className="font-normal text-muted-foreground">MYT</span>
        </label>
        <TimeControl
          id={timeId}
          label={label}
          value={time}
          onChange={setTime}
          disabled={disabled}
        />
      </div>
      {!required && date && (
        <button
          type="button"
          className="justify-self-start text-sm text-muted-foreground underline"
          onClick={() => setDate("")}
          disabled={disabled}
        >
          Clear date &amp; time
        </button>
      )}
    </div>
  );
}

export function DurationField({
  defaultValue = 60,
}: {
  defaultValue?: number;
}) {
  const [minutes, setMinutes] = useState(defaultValue > 0 ? defaultValue : 60);
  return (
    <fieldset className="field-group">
      <legend className="field-label mb-3">Lesson length</legend>
      {![60, 90, 120].includes(minutes) && (
        <>
          <input type="hidden" name="duration_minutes" value={minutes} />
          <p className="mb-3 text-sm text-muted-foreground">
            Current lesson: {minutes} minutes. Choose a length below to change
            it.
          </p>
        </>
      )}
      <div className="duration-options">
        {[
          { value: 60, label: "1 hour", detail: "60 minutes" },
          { value: 90, label: "1.5 hours", detail: "90 minutes" },
          { value: 120, label: "2 hours", detail: "120 minutes" },
        ].map((option) => (
          <label
            key={option.value}
            className="duration-option"
            data-selected={minutes === option.value || undefined}
          >
            <input
              type="radio"
              name="duration_minutes"
              value={option.value}
              checked={minutes === option.value}
              onChange={() => setMinutes(option.value)}
            />
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type StudentOption = { id: number; name: string };
export function ScheduleFields({
  students,
  defaultStudentId,
  defaultDateTime,
  defaultDuration = 60,
}: {
  students: StudentOption[];
  defaultStudentId?: number;
  defaultDateTime?: string;
  defaultDuration?: number;
}) {
  const id = useId();
  const [studentId, setStudentId] = useState(String(defaultStudentId || ""));
  const [trial, setTrial] = useState(false);
  return (
    <div className="schedule-composer">
      <section className="form-section">
        <label htmlFor={`${id}-student`} className="field-label">
          Student
        </label>
        <select
          id={`${id}-student`}
          name="student_id"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="studio-input"
        >
          <option value="">Choose a student</option>
          {students.map((student) => (
            <option value={student.id} key={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </section>
      <section className="form-section">
        <DateTimeField
          name="scheduled_at"
          label="Lesson date"
          timeLabel="Start time"
          defaultValue={defaultDateTime}
          required
        />
        <DurationField
          defaultValue={
            [60, 90, 120].includes(defaultDuration) ? defaultDuration : 60
          }
        />
      </section>
      <label className="compact-trial-option">
        <input
          type="checkbox"
          name="is_trial"
          checked={trial}
          onChange={(e) => setTrial(e.target.checked)}
        />
        <span>
          Trial lesson <span className="text-muted-foreground">(free)</span>
        </span>
      </label>
    </div>
  );
}
