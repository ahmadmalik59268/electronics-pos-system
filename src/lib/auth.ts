import { getSupabase } from './supabase';
import { UserRole } from '../types';

export const OWNER_EMAILS: string[] = [
  'ahmadmalik59268@gmail.com',
];

export function isOwnerAccount(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return OWNER_EMAILS.some((oe) => clean === oe.toLowerCase());
}

export interface AuthUserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at?: string;
}

/**
 * Sign in existing user with Supabase Email and Password
 */
export async function supabaseSignIn(email: string, password: string): Promise<{
  user: any;
  session: any;
  role: UserRole;
  fullName: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured in your Netlify Environment Variables.');
  }

  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('No user data returned from Supabase authentication server.');
  }

  // Determine user role and full name from public.profiles
  const isOwner = isOwnerAccount(cleanEmail);
  let role: UserRole = isOwner ? 'admin' : 'employee';
  let fullName =
    data.user.user_metadata?.full_name ||
    data.user.user_metadata?.name ||
    data.user.email?.split('@')[0] ||
    'Staff User';

  try {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile && profile.role) {
      // Primary owner always maintains admin, others respect profile role
      role = isOwner ? 'admin' : profile.role === 'admin' ? 'admin' : 'employee';
      if (profile.full_name || profile.name) {
        fullName = profile.full_name || profile.name;
      }
    } else {
      // Profile record does not exist yet; create it in public.profiles table
      const initialRole: UserRole = isOwner ? 'admin' : 'employee';
      role = initialRole;
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email || cleanEmail,
        full_name: fullName,
        role: initialRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (pErr) {
    console.warn('Could not query or sync profiles table:', pErr);
  }

  return {
    user: data.user,
    session: data.session,
    role,
    fullName,
  };
}

// Track active sign-up flow to prevent auto-authenticating during registration
let isRegistering = false;

export function setRegisteringState(registering: boolean) {
  isRegistering = registering;
}

export function getRegisteringState() {
  return isRegistering;
}

/**
 * Sign up a new user with Supabase Email, Password, and Full Name.
 * Strict Requirements:
 * - New users get role = employee by default (unless primary owner).
 * - Do NOT automatically enter the dashboard after Sign Up.
 * - Ensure production Netlify origin is passed for emailRedirectTo.
 * - Real Supabase auth is called directly with full error propagation.
 */
export async function supabaseSignUp(
  email: string,
  password: string,
  fullName: string,
  _requestedRole?: UserRole
): Promise<{
  user: any;
  session: any;
  requiresEmailVerification: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured in your Netlify Environment Variables.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const isOwner = isOwnerAccount(cleanEmail);
  // Designated store owner receives admin, all other new accounts default to employee
  const defaultRole: UserRole = isOwner ? 'admin' : 'employee';

  setRegisteringState(true);

  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: cleanName,
          name: cleanName,
          role: defaultRole,
        },
      },
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    const session = data.session;
    const requiresEmailVerification = !session && !!user;

    // Insert or upsert profile in public.profiles table
    if (user) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: cleanEmail,
          full_name: cleanName,
          role: defaultRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn('Could not directly insert into profiles table during signup:', profileErr);
      }
    }

    // MANDATE: After successful registration, immediately sign the user out if Supabase created a session!
    // Do NOT automatically enter the dashboard after Sign Up.
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn('Sign out cleanup error after registration:', signOutErr);
    }

    return {
      user,
      session: null,
      requiresEmailVerification,
    };
  } finally {
    // Keep registering flag active briefly to swallow any trailing onAuthStateChange events
    setTimeout(() => {
      setRegisteringState(false);
    }, 800);
  }
}

/**
 * Send password reset email via Supabase Auth
 */
export async function supabaseResetPassword(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please configure your Project URL & Anon Key.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  if (error) {
    throw error;
  }
}

/**
 * Sign out current user from Supabase
 */
export async function supabaseSignOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
  }
}

/**
 * Retrieve current Supabase active session and corresponding profile
 */
export async function supabaseGetCurrentSession(): Promise<{
  user: any;
  session: any;
  role: UserRole;
  fullName: string;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) return null;

    const user = data.session.user;
    const userEmail = (user.email || '').trim().toLowerCase();
    let role: UserRole = isOwnerAccount(userEmail) ? 'admin' : 'employee';
    let fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Staff User';

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && profile.role) {
        role = profile.role === 'admin' ? 'admin' : 'employee';
        if (profile.full_name || profile.name) {
          fullName = profile.full_name || profile.name;
        }
      }
    } catch (pErr) {
      console.warn('Error reading profile during session restore:', pErr);
    }

    return {
      user,
      session: data.session,
      role,
      fullName,
    };
  } catch (err) {
    console.warn('Error reading active Supabase session:', err);
    return null;
  }
}
