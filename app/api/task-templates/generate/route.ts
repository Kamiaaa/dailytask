import { connectDB } from "@/lib/db";
import TaskTemplate from "@/models/TaskTemplate";
import Team from "@/models/Team";
import Task from "@/models/Task";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";
import { notifyMany } from "@/lib/notify";
import { todayISO } from "@/lib/utils";

// POST: turns each active template (in the caller's scope) into real Task
// rows for today, skipping:
//   - templates whose daysOfWeek doesn't include today (empty list = every day)
//   - any employee who already has a task from that template today
// Safe to call repeatedly (e.g. on every dashboard visit) — it's idempotent.
export async function POST() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "department_head" && session.role !== "admin") {
    return jsonError("Only department heads can generate recurring tasks.", 403);
  }

  await connectDB();

  const filter: Record<string, unknown> = { active: true };
  if (session.role === "department_head") {
    const teams = await Team.find({ head: session.userId }).select("_id");
    filter.team = { $in: teams.map((t) => t._id) };
  }

  const templates = await TaskTemplate.find(filter);
  const today = todayISO();
  const dayOfWeek = new Date().getDay();

  let createdCount = 0;
  const notifications: { userId: string; type: "task_assigned"; message: string; taskId: string }[] =
    [];

  for (const template of templates) {
    if (template.daysOfWeek.length > 0 && !template.daysOfWeek.includes(dayOfWeek)) {
      continue;
    }

    const team = await Team.findById(template.team);
    if (!team) continue;

    const targetIds = template.assignToAll
      ? team.members.map((m) => m.toString())
      : template.assignedTo
      ? [template.assignedTo.toString()]
      : [];

    for (const employeeId of targetIds) {
      const exists = await Task.findOne({
        template: template._id,
        assignedTo: employeeId,
        date: today,
      });
      if (exists) continue;

      const task = await Task.create({
        title: template.title,
        description: template.description || "",
        team: template.team,
        assignedTo: employeeId,
        assignedBy: template.createdBy,
        date: today,
        status: "pending",
        points: 1,
        template: template._id,
      });
      createdCount += 1;
      notifications.push({
        userId: employeeId,
        type: "task_assigned",
        message: `New task assigned: "${template.title}"`,
        taskId: task._id.toString(),
      });
    }

    template.lastGeneratedDate = today;
    await template.save();
  }

  if (notifications.length > 0) {
    await notifyMany(notifications);
  }

  return jsonOk({ createdCount });
}
