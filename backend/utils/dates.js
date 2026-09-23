// utils/dates.js — shop-local day boundaries (DB stores UTC)
// offsetMinutes: e.g. 330 for India (UTC+05:30)

const toLocalParts = (date, offsetMinutes) => {
  const shifted = new Date(date.getTime() + offsetMinutes * 60000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
};

// UTC Date for local midnight of y-m-d
const localMidnight = (y, m, d, offsetMinutes) => new Date(Date.UTC(y, m, d) - offsetMinutes * 60000);

// "YYYY-MM-DD" in shop-local time
const localDateString = (date, offsetMinutes) => {
  const { y, m, d } = toLocalParts(date, offsetMinutes);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const parseYmd = (s) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
  if (!match) return null;
  return { y: +match[1], m: +match[2] - 1, d: +match[3] };
};

// Range covering whole local days: start 00:00 of `from`, end 23:59:59.999 of `to`
const rangeFromStrings = (from, to, offsetMinutes) => {
  const a = parseYmd(from);
  const b = parseYmd(to);
  const start = a ? localMidnight(a.y, a.m, a.d, offsetMinutes) : null;
  const end = b ? new Date(localMidnight(b.y, b.m, b.d + 1, offsetMinutes).getTime() - 1) : null;
  return { start, end };
};

const todayRange = (offsetMinutes, now = new Date()) => {
  const { y, m, d } = toLocalParts(now, offsetMinutes);
  const start = localMidnight(y, m, d, offsetMinutes);
  return { start, end: new Date(localMidnight(y, m, d + 1, offsetMinutes).getTime() - 1) };
};

const monthRange = (offsetMinutes, now = new Date()) => {
  const { y, m } = toLocalParts(now, offsetMinutes);
  return {
    start: localMidnight(y, m, 1, offsetMinutes),
    end: new Date(localMidnight(y, m + 1, 1, offsetMinutes).getTime() - 1),
  };
};

// MySQL CONVERT_TZ-compatible offset string, e.g. "+05:30"
const offsetString = (offsetMinutes) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

module.exports = { localDateString, rangeFromStrings, todayRange, monthRange, offsetString, localMidnight, toLocalParts };
