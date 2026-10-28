import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/config";

const OPEN_AUTH = ["/login", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const { url, anonKey } = publicEnv();
  let nextResponse = response;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        nextResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          nextResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isIngest = path.startsWith("/api/ingest");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isReset = path.startsWith("/reset-password");
  const isOpenAuth = OPEN_AUTH.some((item) => path === item);

  if (!user && !isIngest && !isAuthCallback && !isReset && !isOpenAuth) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    nextResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  if (user && isOpenAuth) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    nextResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  return nextResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
