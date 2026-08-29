export type WashType = "Basic" | "Premium" | "Full Detail";

export type KeyOption =
  | "Hand key to worker"
  | "Drive myself"
  | "Drop at info desk";

export type KeyStatus = "none" | "awaiting" | "collected" | "returned";

export type BookingStatus = "pending" | "in_progress" | "done";

export type UserRole = "admin" | "operator" | "worker";

export interface Location {
  id: string;
  name: string;
  qr_code_url: string | null;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  available: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  name: string;
  phone: string;
  car_number: string;
  car_color: string;
  parking_slot: string;
  wash_type: WashType;
  key_option: KeyOption;
  key_status: KeyStatus;
  key_handover_note: string | null;
  status: BookingStatus;
  location: string;
  otp: string;
  worker_id: string | null;
  photos_before: string[] | null;
  photos_after: string[] | null;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  role: UserRole;
  worker_id: string | null;
  created_at: string;
}
