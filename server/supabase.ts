import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Le serveur doit utiliser la service_role : les tables publiques sont passées
// en RLS sans policy, donc la clé anon n'y a plus aucun accès. La clé anon ne
// reste qu'un repli de développement (l'app échouera bruyamment si RLS est
// active et que la service_role manque).
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY in dev) environment variables must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
