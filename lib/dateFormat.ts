type DateValue = string | Date;

type DateFormatOptions = {
  timeZone?: string;
  year?: "numeric";
  month?: "short" | "long" | "2-digit";
  day?: "numeric" | "2-digit";
};

const DEFAULT_GREGORIAN: DateFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

const DEFAULT_SOLAR: DateFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

function asDate(value: DateValue) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithLocale(
  value: DateValue,
  locale: string,
  options: DateFormatOptions
) {
  const date = asDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return date.toLocaleDateString(locale, options);
}

function getSolarLocale() {
  try {
    const fmt = new Intl.DateTimeFormat("fa-AF-u-ca-persian");
    fmt.format(new Date());
    return "fa-AF-u-ca-persian";
  } catch {
    return "fa-IR-u-ca-persian";
  }
}

export function formatGregorianDate(
  value: DateValue,
  options: DateFormatOptions = DEFAULT_GREGORIAN
) {
  return formatWithLocale(value, "en-US", options);
}

export function formatSolarHijriDate(
  value: DateValue,
  options: DateFormatOptions = DEFAULT_SOLAR
) {
  return formatWithLocale(value, getSolarLocale(), options);
}

export function formatDualDate(value: DateValue) {
  const gregorian = formatGregorianDate(value);
  const solar = formatSolarHijriDate(value);
  return `${gregorian} • ${solar}`;
}

export function formatDualDateShort(value: DateValue) {
  const shortOptions: DateFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const gregorian = formatGregorianDate(value, shortOptions);
  const solar = formatSolarHijriDate(value, shortOptions);
  return `${gregorian} • ${solar}`;
}
