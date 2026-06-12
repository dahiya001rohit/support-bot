import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0e0f11] px-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#5e6ad2] mb-4">404</h1>
        <p className="text-xl text-[#e6e6e9] mb-2">Page not found</p>
        <p className="text-[#8a8f98] mb-8">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="inline-block rounded-md bg-[#5e6ad2] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6e7ae2]"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
