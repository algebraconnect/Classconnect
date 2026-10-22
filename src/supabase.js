import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';
import { APP_CONFIG, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function getMyProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEpisode() {
  const { data, error } = await supabase.from('episodes').select('*').eq('slug', 'episode-one').maybeSingle();
  if (error) throw error;
  return data;
}

export async function getComments(episodeId) {
  const { data, error } = await supabase.from('comments').select('id, episode_id, parent_id, author_id, body, created_at, deleted_at').eq('episode_id', episodeId).order('created_at', { ascending: true });
  if (error) throw error;
  if (!data?.length) return [];
  const authorIds = [...new Set(data.map((comment) => comment.author_id))];
  const { data: authors, error: authorsError } = await supabase.from('profiles_public').select('id, full_name, avatar_url, role, approval_status').in('id', authorIds);
  if (authorsError) throw authorsError;
  const authorMap = new Map((authors || []).map((author) => [author.id, author]));
  const uniqueComments = [...new Map(data.map((comment) => [comment.id, comment])).values()];
  return uniqueComments.map((comment) => ({ ...comment, author: authorMap.get(comment.author_id) || { id: comment.author_id, full_name: 'Class member', role: 'student', approval_status: 'pending' } }));
}

export async function createComment({ episodeId, parentId = null, body, authorId }) {
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > APP_CONFIG.maxCommentLength) throw new Error('Your response must be between 1 and 2,000 characters.');
  const { data, error } = await supabase.from('comments').insert({ episode_id: episodeId, parent_id: parentId, body: cleanBody, author_id: authorId }).select('id').single();
  if (error) throw error;
  return data;
}

export async function removeOwnComment(commentId) {
  const { data, error } = await supabase.rpc('remove_own_comment', { target_comment_id: commentId });
  if (error) throw error;
  return data;
}

export async function removeCommentAsAdmin(commentId) {
  const { data, error } = await supabase.rpc('admin_delete_comment_permanently', { target_comment_id: commentId });
  if (error) throw error;
  return data;
}

export async function listMembers() {
  const { data, error } = await supabase.from('profiles').select('id, full_name, email, avatar_url, approval_status, role, created_at').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function setMemberStatus(memberId, status) {
  const { data, error } = await supabase.rpc('admin_set_member_status', { target_user_id: memberId, next_status: status });
  if (error) throw error;
  return data;
}

export async function setMemberRole(memberId, role) {
  const { data, error } = await supabase.rpc('admin_set_member_role', { target_user_id: memberId, next_role: role });
  if (error) throw error;
  return data;
}

export async function createEpisode({ title, body }) {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  if (!cleanTitle || !cleanBody) throw new Error('Add both a title and the episode writing.');
  const { data, error } = await supabase.rpc('admin_create_episode', { episode_title: cleanTitle, episode_body: cleanBody });
  if (error) throw error;
  return data;
}

export async function bootstrapAdmin() {
  const { data, error } = await supabase.rpc('bootstrap_initial_admin');
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return false;
    throw error;
  }
  return Boolean(data);
}
