export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
