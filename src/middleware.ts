import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
  // Seule /dashboard nécessite une session (admin/client sont du code mort, sans route).
  // Le middleware ne s'exécute donc plus du tout sur les pages publiques (marketing,
  // guides, robots.txt, sitemap.xml...), ce qui supprime son overhead d'edge function
  // pour tout ce qui n'a pas besoin d'auth.
  matcher: ["/dashboard", "/dashboard/:path*"],
};
