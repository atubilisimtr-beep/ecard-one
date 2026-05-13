import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Accept both project URL and accidental /rest/v1 URL input.
const url = rawUrl?.replace(/\/rest\/v1\/?$/, "");

export const hasSupabase = Boolean(url && anonKey);

export const supabase = hasSupabase
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
