import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes publiques — jamais de redirection
const PUBLIC_EXACT = new Set(["/", "/services", "/demo", "/on-vous-montre", "/cgv", "/mentions-legales", "/confidentialite", "/set-password", "/robots.txt", "/sitemap.xml"]);
const PUBLIC_PREFIX = ["/auth/", "/api/", "/_next/", "/favicon"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer toutes les routes publiques sans toucher aux cookies
  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Pour les routes protégées (/admin/*, /client/*), vérifier la session
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: object }[]) =>
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclure fichiers statiques Next.js et assets
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
