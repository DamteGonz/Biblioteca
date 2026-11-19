import { createClient } from "@supabase/supabase-js";

// Datos públicos del proyecto (la clave "publishable" está pensada para ir en el navegador;
// la seguridad la ponen las políticas RLS: cada usuario solo ve y modifica lo suyo).
const URL = "https://kczcxklecbmkdlzxbzar.supabase.co";
const KEY = "sb_publishable_F4shDax3ZJc0QQDuBAGISg_nnEiJ6dz";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
