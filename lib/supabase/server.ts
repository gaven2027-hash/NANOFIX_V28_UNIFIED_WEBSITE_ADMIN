import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const mutableCookieStore = cookieStore as unknown as {
    get(name: string): { value?: string } | undefined;
    set(args: { name: string; value: string; [key: string]: unknown }): void;
  };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase browser-safe environment variables.');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return mutableCookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        mutableCookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: Record<string, unknown>) {
        mutableCookieStore.set({ name, value: '', ...options });
      }
    }
  });
}
