const IST = "Asia/Kolkata";

const toUTC = (ts) => {
  if (!ts) return null;
  const s = String(ts);
  return s.endsWith("Z") || s.includes("+") ? new Date(s) : new Date(s + "Z");
};

export const formatIST = (ts, opts = {}) => {
  const d = toUTC(ts);
  if (!d || isNaN(d)) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
};

export const formatISTFull = (ts) =>
  formatIST(ts, { weekday: "long", second: "2-digit" });

export const formatISTDate = (ts) => {
  const d = toUTC(ts);
  if (!d || isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" });
};

export const formatISTTime = (ts) => {
  const d = toUTC(ts);
  if (!d || isNaN(d)) return "—";
  return d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true });
};

export const formatISTDateTime = (ts) => {
  const d = toUTC(ts);
  if (!d || isNaN(d)) return "—";
  return d.toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

export const timeAgoIST = (ts) => {
  const d = toUTC(ts);
  if (!d || isNaN(d)) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
