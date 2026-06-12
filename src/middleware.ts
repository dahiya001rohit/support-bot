import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const BLOCKED_PATHS = [
  "/admin",
  "/wp-admin",
  "/phpMyAdmin",
  "/.git",
  "/.env",
  "/config",
  "/internal",
  "/debug",
];

const ALLOWED_PREFIXES = ["/api", "/dashboard", "/login", "/register", "/_next"];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Redirect blocked paths to home
  if (BLOCKED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};