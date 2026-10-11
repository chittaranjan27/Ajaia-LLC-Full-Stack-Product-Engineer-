import { createClient } from '@supabase/supabase-js';

const procEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env;
const supabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL ||
  procEnv?.VITE_SUPABASE_URL ||
  'https://placeholder-domain.supabase.co';
const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  procEnv?.VITE_SUPABASE_ANON_KEY ||
  'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  (import.meta.env?.VITE_SUPABASE_URL || procEnv?.VITE_SUPABASE_URL) &&
    (import.meta.env?.VITE_SUPABASE_ANON_KEY || procEnv?.VITE_SUPABASE_ANON_KEY)
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ConnectionCheckResult {
  success: boolean;
  message: string;
  error?: string;
  latencyMs?: number;
  tablesVerified?: string[];
}

/**
 * Safe, minimal connection check that queries the documents table without exposing secrets or credentials.
 * Performs a HEAD request count to test API reachability and schema validation.
 */
export async function checkSupabaseConnection(): Promise<ConnectionCheckResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Missing Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY).',
    };
  }

  const startTime = performance.now();
  try {
    const { error, status } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      return {
        success: false,
        message: `Supabase query returned status ${status}.`,
        error: error.message,
        latencyMs,
      };
    }

    return {
      success: true,
      message: 'Connected to Supabase successfully.',
      latencyMs,
      tablesVerified: ['documents'],
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'Network or configuration error connecting to Supabase.',
      error: errorMessage,
      latencyMs,
    };
  }
}