import { supabase } from "./supabase";

export async function authenticate(Astro) {
    const accessToken = Astro.cookies.get("sb-access-token");
    const refreshToken = Astro.cookies.get("sb-refresh-token");

    // Si no hay tokens, redirigir al inicio de sesión
    if (!accessToken || !refreshToken) {
        clearSessionCookies(Astro);
        return { redirect: "/signin" };
    }

    try {
        // Establecer la sesión con los tokens
        const { data, error } = await supabase.auth.setSession({
            refresh_token: refreshToken.value,
            access_token: accessToken.value,
        });

        // Si hay un error o no hay usuario, limpiar cookies y redirigir
        if (error || !data.user) {
            clearSessionCookies(Astro);
            return { redirect: "/signin" };
        }

        // Devolver el usuario autenticado
        return { user: data.user };
    } catch (error) {
        // En caso de error, limpiar cookies y redirigir
        clearSessionCookies(Astro);
        return { redirect: "/signin" };
    }
}

// Función auxiliar para limpiar las cookies de sesión
function clearSessionCookies(Astro) {
    Astro.cookies.delete("sb-access-token", { path: "/" });
    Astro.cookies.delete("sb-refresh-token", { path: "/" });
}