const STORAGE_KEY = "quickwash_device_id";

// Not an auth credential — just lets a customer's own browser recognize bookings
// it made, so they can re-book a previous car or glance at their history without
// typing anything. The value never leaves their device except attached to their
// own booking rows, and is unguessable enough that nobody else can look it up.
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
