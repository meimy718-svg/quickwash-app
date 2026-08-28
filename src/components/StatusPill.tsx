import type { BookingStatus } from "@/lib/types";

const STYLES: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300",
  done: "bg-green-100 text-green-800 border-green-300",
};

const LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

export default function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-0.5 ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
