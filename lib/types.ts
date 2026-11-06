export type Student = {
  id: number;
  name: string;
  subject: string | null;
  grade_level: string | null;
  phone: string | null;
  email: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  hourly_rate: number;
  notes: string | null;
  active: number;
  created_at: string;
};

export type ClassStatus = "scheduled" | "completed" | "canceled";
export type Attendance = "present" | "absent" | "late" | null;

export type ClassRow = {
  id: number;
  student_id: number;
  scheduled_at: string;
  duration_minutes: number;
  subject: string | null;
  location: string | null;
  status: ClassStatus;
  attendance: Attendance;
  recurrence_id: number | null;
  is_trial: number;
  cancel_reason: string | null;
  rescheduled_from: number | null;
  created_at: string;
};

export type ClassWithStudent = ClassRow & {
  student_name: string;
  hourly_rate: number;
};

export type Report = {
  id: number;
  class_id: number;
  topics_covered: string | null;
  homework: string | null;
  performance: string | null;
  strengths: string | null;
  areas_to_improve: string | null;
  next_focus: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "canceled";

export type Invoice = {
  id: number;
  student_id: number;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: InvoiceStatus;
  issued_at: string;
  paid_at: string | null;
  notes: string | null;
};

export type InvoiceItem = {
  id: number;
  invoice_id: number;
  class_id: number | null;
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
};

export type RecurrenceFrequency = "weekly" | "biweekly" | "custom";

export type Recurrence = {
  id: number;
  student_id: number;
  day_of_week: number;
  time: string;
  duration_minutes: number;
  subject: string | null;
  location: string | null;
  frequency: RecurrenceFrequency;
  custom_interval_days: number | null;
  start_date: string;
  end_date: string | null;
  active: number;
  created_at: string;
};

export type Holiday = {
  id: number;
  name: string;
  date: string;
  created_at: string;
};

export type StudentNote = {
  id: number;
  student_id: number;
  content: string;
  created_at: string;
};

export type ShareToken = {
  id: number;
  student_id: number;
  token: string;
  active: number;
  created_at: string;
};
