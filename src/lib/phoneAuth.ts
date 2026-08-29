// Staff and Supervisor accounts log in with a phone number, not an email.
// Supabase Auth still needs an email under the hood, so we generate one from
// the phone number that nobody ever sees or types directly. This must be
// deterministic so the same phone always maps to the same login.
const SYNTHETIC_DOMAIN = "staff.quickwash.internal";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phoneToSyntheticEmail(phone: string): string {
  return `${normalizePhone(phone)}@${SYNTHETIC_DOMAIN}`;
}

export function isSyntheticEmail(email: string): boolean {
  return email.endsWith(`@${SYNTHETIC_DOMAIN}`);
}
