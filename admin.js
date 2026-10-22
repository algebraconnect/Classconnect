import { listMembers, setMemberRole, setMemberStatus } from './supabase.js';
import { avatarMarkup, escapeAttr, escapeHtml, roleLabel, showInlineAlert, statusMarkup } from './ui.js';

let members = [];
let adminProfile = null;

const ROLE_OPTIONS = ['student', 'lecturer', 'course_representative', 'assistant', 'admin'];

function memberMarkup(member) {
  const action = member.approval_status === 'pending'
    ? `<button class="approve-button" type="button" data-status="approved" data-member-id="${escapeAttr(member.id)}">Approve</button>`
    : member.approval_status === 'approved'
      ? `<button class="revoke-button" type="button" data-status="revoked" data-member-id="${escapeAttr(member.id)}">Revoke</button>`
      : `<button class="restore-button" type="button" data-status="approved" data-member-id="${escapeAttr(member.id)}">Restore</button>`;
  const roleOptions = ROLE_OPTIONS.map((role) => `<option value="${role}" ${role === member.role ? 'selected' : ''}>${escapeHtml(roleLabel(role))}</option>`).join('');
  return `<article class="member-row"><div>${avatarMarkup(member)}</div><div class="member-info"><strong>${escapeHtml(member.full_name || 'Unnamed member')}</strong><span>${escapeHtml(member.email || 'No email supplied')}</span><div class="member-meta">${statusMarkup(member.approval_status)}</div></div><div class="member-controls"><select aria-label="Role for ${escapeAttr(member.full_name || 'member')}" data-role-select="${escapeAttr(member.id)}">${roleOptions}</select>${action}</div></article>`;
}

function renderMembers() {
  const search = (document.querySelector('#member-search')?.value || '').toLowerCase().trim();
  const filtered = members.filter((member) => `${member.full_name || ''} ${member.email || ''}`.toLowerCase().includes(search));
  const pending = filtered.filter((member) => member.approval_status !== 'approved');
  const approved = filtered.filter((member) => member.approval_status === 'approved');
  document.querySelector('#pending-count').textContent = String(pending.length);
  document.querySelector('#approved-count').textContent = String(approved.length);
  document.querySelector('#pending-members').innerHTML = pending.length ? pending.map(memberMarkup).join('') : '<div class="member-empty">No pending or revoked members match this search.</div>';
  document.querySelector('#approved-members').innerHTML = approved.length ? approved.map(memberMarkup).join('') : '<div class="member-empty">No approved members match this search.</div>';
  bindActions();
}

async function changeStatus(memberId, status) {
  const member = members.find((item) => item.id === memberId);
  if (!member) return;
  const action = status === 'approved' ? (member.approval_status === 'revoked' ? 'restore' : 'approve') : 'revoke';
  if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${member.full_name || 'this member'}?`)) return;
  try { await setMemberStatus(memberId, status); await loadMembers(); showInlineAlert(document.querySelector('#admin-alert'), `Membership updated for ${member.full_name || 'the member'}.`, 'success'); }
  catch (error) { showInlineAlert(document.querySelector('#admin-alert'), error.message || 'The membership change was not saved.'); }
}

async function changeRole(memberId, role) {
  const member = members.find((item) => item.id === memberId);
  if (!member || member.role === role) return;
  if (!window.confirm(`Assign ${roleLabel(role)} to ${member.full_name || 'this member'}?`)) { renderMembers(); return; }
  try { await setMemberRole(memberId, role); await loadMembers(); showInlineAlert(document.querySelector('#admin-alert'), `Role updated for ${member.full_name || 'the member'}.`, 'success'); }
  catch (error) { showInlineAlert(document.querySelector('#admin-alert'), error.message || 'The role change was not saved.'); renderMembers(); }
}

function bindActions() {
  document.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => changeStatus(button.dataset.memberId, button.dataset.status)));
  document.querySelectorAll('[data-role-select]').forEach((select) => select.addEventListener('change', () => changeRole(select.dataset.roleSelect, select.value)));
}

export async function loadMembers() {
  const pending = document.querySelector('#pending-members');
  const approved = document.querySelector('#approved-members');
  if (pending) pending.innerHTML = '<div class="loading-shimmer"></div>';
  if (approved) approved.innerHTML = '<div class="loading-shimmer"></div>';
  members = await listMembers();
  renderMembers();
  return members;
}

export function initAdmin(profile) {
  adminProfile = profile;
  const search = document.querySelector('#member-search');
  search?.addEventListener('input', renderMembers);
  document.querySelector('#refresh-members')?.addEventListener('click', () => loadMembers().catch((error) => showInlineAlert(document.querySelector('#admin-alert'), error.message || 'Could not refresh members.')));
  if (adminProfile?.role === 'admin' && adminProfile?.approval_status === 'approved') return loadMembers();
  return Promise.resolve([]);
}
