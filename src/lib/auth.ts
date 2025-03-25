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

// Ejemplo de implementación básica si no funciona la anterior
export async function getSession({ cookies }) {
  try {
    // Obtener el token de la cookie
    const sessionCookie = cookies.get('session');
    
    if (!sessionCookie || !sessionCookie.value) {
      console.log('No se encontró cookie de sesión');
      return null;
    }
    
    // Decodificar el token (esto podría variar según tu implementación)
    let decodedSession;
    try {
      // Para sesiones simples almacenadas como JSON
      decodedSession = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch (e) {
      // Si no es JSON, podría ser un token JWT o algún otro formato
      console.error('Error al decodificar sesión:', e);
      return null;
    }
    
    return decodedSession;
  } catch (error) {
    console.error('Error en getSession:', error);
    return null;
  }
}