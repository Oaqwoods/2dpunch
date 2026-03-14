/**
 * Maps raw Supabase / network errors to user-friendly messages.
 */
export function parseSupabaseError(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';

  const msg: string =
    (err as { message?: string }).message ??
    JSON.stringify(err);

  // RLS rate limit hit (policy check fails with this generic string)
  if (
    msg.includes('violates row-level security policy') ||
    msg.includes('row-level security policy')
  ) {
    return "You've hit the posting limit for this hour. Try again later.";
  }

  // Hate-speech trigger
  if (msg.includes('community guidelines')) return msg;

  // Unique constraint (duplicate challenge / like)
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return "You've already done that.";
  }

  // Auth errors
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.toLowerCase().includes('password should be')) return msg;

  // Network / fetch errors
  if (
    msg.toLowerCase().includes('networkerror') ||
    msg.toLowerCase().includes('failed to fetch') ||
    msg.toLowerCase().includes('network request failed')
  ) {
    return 'Network error. Check your connection and try again.';
  }

  // Timeout
  if (msg.toLowerCase().includes('timeout')) {
    return 'Request timed out. Check your connection.';
  }

  return msg;
}
