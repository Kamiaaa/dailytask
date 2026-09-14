export type UserRole = "admin" | "department_head" | "employee";

export interface EmployeeDTO {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
}

export interface TeamDTO {
  _id: string;
  name: string;
  department: string;
  head: EmployeeDTO | string;
  members: EmployeeDTO[];
}

export interface TaskDTO {
  _id: string;
  title: string;
  description?: string;
  team: string;
  assignedTo: EmployeeDTO | string;
  assignedBy: EmployeeDTO | string;
  date: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  points: number;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: EmployeeDTO | string;
  reviewNote?: string;
}

export interface ScoreEntry {
  employee: EmployeeDTO;
  totalAssigned: number;
  totalCompleted: number;
  score: number; // percentage, 0-100
}

export interface NotificationDTO {
  _id: string;
  type: "task_assigned" | "task_submitted" | "task_approved" | "task_rejected";
  message: string;
  task?: string;
  read: boolean;
  createdAt: string;
}

export interface TaskTemplateDTO {
  _id: string;
  title: string;
  description?: string;
  team: string;
  createdBy: EmployeeDTO | string;
  assignToAll: boolean;
  assignedTo?: EmployeeDTO | string;
  daysOfWeek: number[];
  active: boolean;
  lastGeneratedDate?: string;
}
