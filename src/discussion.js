import { createComment, getComments, removeCommentAsAdmin, removeOwnComment } from './supabase.js';
import { approvalBadge, avatarMarkup, escapeAttr, escapeHtml, formatDate, roleMarkup, showToast } from './ui.js';

let state = { episodeId: null, profile: null, comments: [], toast: null, onChanged: null };

function canPost() { return state.profile?.approval_status === 'approved'; }
function visibleText(comment) { return comment.deleted_at ? '<span class="deleted-comment">Comment removed by its author or a moderator.</span>' : escapeHtml(comment.body); }

function commentMarkup(comment, isReply = false) {
  const isOwner = comment.author_id === state.profile?.id;
  const isAdmin = state.profile?.role === 'admin' && state.profile?.approval_status === 'approved';
  const parent = isReply ? state.comments.find((item) => item.id === comment.parent_id) : null;
  const replyContext = parent ? replyContextMarkup(parent, true) : '';
  const actions = comment.deleted_at
    ? (isAdmin ? `<div class="comment-actions"><button class="text-button danger admin-delete-comment" data-comment-id="${escapeAttr(comment.id)}" type="button">Delete permanently</button></div>` : '')
    : `<div class="comment-actions">${canPost() ? `<button class="text-button reply-trigger" data-comment-id="${escapeAttr(comment.id)}" type="button">Reply</button>` : ''}${isOwner ? `<button class="text-button danger delete-comment" data-comment-id="${escapeAttr(comment.id)}" type="button">Delete</button>` : ''}${isAdmin && !isOwner ? `<button class="text-button danger admin-delete-comment" data-comment-id="${escapeAttr(comment.id)}" type="button">Delete permanently</button>` : ''}</div>`;
  return `<article class="comment ${isReply ? 'comment-reply' : ''}" data-comment="${escapeAttr(comment.id)}"><div class="comment-main">${avatarMarkup(comment.author)}<div class="comment-body">${replyContext}<div class="comment-meta"><strong>${escapeHtml(comment.author.full_name || 'Class member')}</strong>${approvalBadge(comment.author.approval_status)}${roleMarkup(comment.author.role)}<span class="comment-time">${formatDate(comment.created_at)}</span></div><p class="comment-text">${visibleText(comment)}</p>${actions}</div></div><div class="reply-slot"></div></article>`;
}

function replyContextMarkup(comment, posted = false) {
  const authorName = comment.author?.full_name || 'Class member';
  const message = comment.deleted_at ? 'Comment removed' : comment.body || '';
  const label = posted ? 'Replied to' : 'Replying to';
  return `<div class="reply-context" aria-label="${label} ${escapeAttr(authorName)}"><span class="reply-context-label">${label} ${escapeHtml(authorName)}</span><blockquote>${escapeHtml(message)}</blockquote></div>`;
}

function treeMarkup() {
  const replies = new Map();
  for (const comment of state.comments) {
    const key = comment.parent_id || 'root';
    if (!replies.has(key)) replies.set(key, []);
    replies.get(key).push(comment);
  }
  const renderBranch = (comment, isReply = false) => {
    const children = (replies.get(comment.id) || []).map((child) => renderBranch(child, true)).join('');
    return `${commentMarkup(comment, isReply)}${children ? `<div class="replies">${children}</div>` : ''}`;
  };
  return (replies.get('root') || []).map((comment) => renderBranch(comment)).join('');
}

function updateCount() {
  const count = document.querySelector('#discussion-count');
  const sidebarCount = document.querySelector('#comment-count');
  const value = state.comments.length;
  if (count) count.textContent = String(value);
  if (sidebarCount) sidebarCount.textContent = String(value);
}

function render() {
  const list = document.querySelector('#discussion-list');
  if (!list) return;
  updateCount();
  list.innerHTML = state.comments.length ? treeMarkup() : '<div class="discussion-empty">No one has added a thought yet. Your perspective can open the conversation.</div>';
  bindDynamicActions();
}

function insertReplyForm(commentId) {
  const comment = document.querySelector(`[data-comment="${CSS.escape(commentId)}"]`);
  const source = state.comments.find((item) => item.id === commentId);
  if (!comment || !source || comment.querySelector('.reply-form')) return;
  const slot = comment.querySelector('.reply-slot');
  slot.innerHTML = `${replyContextMarkup(source)}<form class="reply-form" data-reply-form="${escapeAttr(commentId)}"><input name="reply" maxlength="2000" placeholder="Write a reply…" aria-label="Write a reply" required /><button type="submit">Reply</button></form>`;
  const form = slot.querySelector('[data-reply-form]');
  form?.addEventListener('submit', (event) => { event.preventDefault(); submitReply(form); });
  slot.querySelector('input')?.focus();
}

async function submitReply(form) {
  const parentId = form.dataset.replyForm;
  const input = form.querySelector('input');
  const body = input.value.trim();
  if (!body) return;
  const button = form.querySelector('button');
  button.disabled = true;
  button.textContent = 'Posting…';
  try {
    await createComment({ episodeId: state.episodeId, parentId, body, authorId: state.profile.id });
    await loadDiscussion();
    showToast(state.toast, 'Reply posted.', 'success');
  } catch (error) {
    showToast(state.toast, error.message || 'Could not post your reply.', 'error');
    button.disabled = false;
    button.textContent = 'Reply';
  }
}

async function deleteComment(commentId, admin = false) {
  const message = admin ? 'Permanently delete this comment and its replies for everyone? This cannot be undone.' : 'Delete your comment? Replies will remain with a placeholder.';
  if (!window.confirm(message)) return;
  try {
    if (admin) await removeCommentAsAdmin(commentId); else await removeOwnComment(commentId);
    await loadDiscussion();
    showToast(state.toast, 'The comment was removed.', 'success');
  } catch (error) { showToast(state.toast, error.message || 'Could not remove the comment.', 'error'); }
}

function bindDynamicActions() {
  document.querySelectorAll('.reply-trigger').forEach((button) => button.addEventListener('click', () => insertReplyForm(button.dataset.commentId)));
  document.querySelectorAll('.delete-comment').forEach((button) => button.addEventListener('click', () => deleteComment(button.dataset.commentId)));
  document.querySelectorAll('.admin-delete-comment').forEach((button) => button.addEventListener('click', () => deleteComment(button.dataset.commentId, true)));
  document.querySelectorAll('[data-reply-form]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); submitReply(form); }));
}

function renderPermission() {
  const note = document.querySelector('#discussion-permission');
  const form = document.querySelector('#comment-form');
  const access = document.querySelector('#access-label');
  if (!state.profile) {
    note.className = 'permission-note'; note.textContent = 'Sign in to read the live conversation and add a response.'; form.hidden = true; if (access) access.textContent = 'Sign in'; return;
  }
  const status = state.profile.approval_status;
  if (status === 'approved') { note.className = 'permission-note approved'; note.textContent = 'Your account is approved. Add a thoughtful response or reply to a classmate.'; form.hidden = false; if (access) access.textContent = 'Approved'; }
  else if (status === 'revoked') { note.className = 'permission-note revoked'; note.textContent = 'Your account can read the discussion, but publishing is paused while approval is revoked.'; form.hidden = true; if (access) access.textContent = 'Read only'; }
  else { note.className = 'permission-note'; note.textContent = 'Your account is pending approval. You can read the full discussion, and posting will unlock after approval.'; form.hidden = true; if (access) access.textContent = 'Pending'; }
}

export function initDiscussion({ episodeId, profile, toast, onChanged }) {
  state = { episodeId, profile, comments: [], toast, onChanged };
  renderPermission();
  const form = document.querySelector('#comment-form');
  const input = document.querySelector('#comment-input');
  const count = document.querySelector('#character-count');
  if (input && !input.dataset.discussionBound) {
    input.dataset.discussionBound = 'true';
    input.addEventListener('input', () => { if (count) count.textContent = String(input.value.length); });
  }
  if (!form || form.dataset.discussionBound) return loadDiscussion();
  form.dataset.discussionBound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!canPost() || state.submitting) return;
    state.submitting = true;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true; button.innerHTML = '<span class="spinner"></span>Posting';
    try { await createComment({ episodeId, body: input.value, authorId: profile.id }); input.value = ''; if (count) count.textContent = '0'; await loadDiscussion(); showToast(toast, 'Comment posted to the class room.', 'success'); }
    catch (error) { showToast(toast, error.message || 'Could not post your comment.', 'error'); }
    finally { state.submitting = false; button.disabled = false; button.innerHTML = 'Post comment'; }
  });
  return loadDiscussion();
}

export async function loadDiscussion() {
  const list = document.querySelector('#discussion-list');
  if (list) list.innerHTML = '<div class="loading-shimmer"></div><div class="loading-shimmer"></div>';
  try { state.comments = await getComments(state.episodeId); render(); state.onChanged?.(state.comments); }
  catch (error) {
    console.warn('ClassConnect discussion load failed', error);
    if (list) list.innerHTML = '<div class="discussion-empty">We couldn’t load the class conversation right now. Please check the setup and try again.</div>';
  }
}
