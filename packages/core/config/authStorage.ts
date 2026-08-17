// supabase-js's default auth storage key is `sb-<projectRef>-auth-token`,
// derived from supabaseUrl — which would change every time the URL swaps
// between direct and proxy hosts, logging everyone out. Pinning to a
// project-stable name decouples the session from the URL.
export const STABLE_STORAGE_KEY = 'sb-bystrobarista-auth-token';
