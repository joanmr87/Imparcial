const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires"

export function formatArgentinaLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}
