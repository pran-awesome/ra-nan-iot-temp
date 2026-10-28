import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Smart Sop Puen</p>
      <h1 className="mt-2 text-3xl font-extrabold">Page not found</h1>
      <Link href="/" className="mt-4 text-[13.5px] font-semibold text-primary">Back to the dashboard</Link>
    </main>
  );
}
