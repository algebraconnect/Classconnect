import { supabase } from './supabase.js';

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export function getIdentityDetails(user) {
  const metadata = user?.user_metadata || {};
  return {
    name: metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Class member',
    email: user?.email || '',
    avatarUrl: metadata.avatar_url || metadata.picture || '',
  };
}
