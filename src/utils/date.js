export function formatDisplayDate(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Local calendar YYYY-MM-DD (avoids UTC day shift from toISOString). */
export function formatLocalDateInput(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalMonthInput(date = new Date()) {
  return formatLocalDateInput(date).slice(0, 7);
}

export function formatDisplayMonthLabel(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleString("en-US", { month: "long" }).toLowerCase();
  return `${monthName}-${year}`;
}
