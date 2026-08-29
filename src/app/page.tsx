import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-3xl font-bold text-slate-900">4OR CarSpa</h1>
        <p className="text-slate-500 text-sm">
          Scan the QR code at your mall parking location, or use the link below to book a
          car wash.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/book"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 text-sm transition"
          >
            Book a wash
          </Link>
          <Link
            href="/login"
            className="text-slate-500 hover:text-slate-900 text-sm underline"
          >
            Staff login
          </Link>
        </div>
      </div>
    </div>
  );
}
