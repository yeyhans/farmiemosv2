// lib/auth.ts
import { supabase } from "./supabase";

export async function authenticate(Astro) {
    const accessToken = Astro.cookies.get("sb-access-token");
    const refreshToken = Astro.cookies.get("sb-refresh-token");

    if (!accessToken || !refreshToken) {
        return { redirect: "/signin" };
    }

    try {
        const { data, error } = await supabase.auth.setSession({
            refresh_token: refreshToken.value,
            access_token: accessToken.value,
        });
        if (error) {
            Astro.cookies.delete("sb-access-token", { path: "/" });
            Astro.cookies.delete("sb-refresh-token", { path: "/" });
            return { redirect: "/signin" };
        }

        if (!data.user) {
            Astro.cookies.delete("sb-access-token", { path: "/" });
            Astro.cookies.delete("sb-refresh-token", { path: "/" });
            return { redirect: "/signin" };
        }

        return { user: data.user };
    } catch (error) {
        Astro.cookies.delete("sb-access-token", { path: "/" });
        Astro.cookies.delete("sb-refresh-token", { path: "/" });
        return { redirect: "/signin" };
    }
}
