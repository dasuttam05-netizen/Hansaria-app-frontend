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
