const ROLE_LABELS = Object.freeze({
  admin: 'Admin',
  lecturer: 'Lecturer',
  course_representative: 'Course Representative',
  assistant: 'Assistant',
  student: 'Student',
});

const STATUS_LABELS = Object.freeze({ pending: 'Pending approval', approved: 'Approved', revoked: 'Revoked' });

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

export function escapeAttr(value = '') { return escapeHtml(value).replace(/`/g, '&#96;'); }
export function roleLabel(role) { return ROLE_LABELS[role] || 'Student'; }
export function statusLabel(status) { return STATUS_LABELS[status] || 'Pending approval'; }
export function formatDate(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export function initials(name = 'Class member') { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CM'; }
export function safeAvatarUrl(value = '') {
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && window.location.protocol === 'http:')) return url.href;
  } catch {
    // Treat malformed or non-web avatar metadata as absent.
  }
  return '';
}

export function avatarMarkup(profile, className = 'avatar') {
  const name = profile?.full_name || 'Class member';
  const avatarUrl = safeAvatarUrl(profile?.avatar_url);
  return `<span class="${className}">${avatarUrl ? `<img src="${escapeAttr(avatarUrl)}" alt="" referrerpolicy="no-referrer" />` : escapeHtml(initials(name))}</span>`;
}

export function approvalBadge(status) { return status === 'approved' ? '<span class="approval-badge" title="Approved ClassConnect member" aria-label="Approved ClassConnect member">✓</span>' : ''; }
export function roleMarkup(role) { return `<span class="role-chip">${escapeHtml(roleLabel(role))}</span>`; }
export function statusMarkup(status) { return `<span class="status-chip ${escapeAttr(status)}">${escapeHtml(statusLabel(status))}</span>`; }

export function showElement(element, shouldShow = true) { if (element) element.hidden = !shouldShow; }
export function setText(element, text) { if (element) element.textContent = text; }

export function showInlineAlert(element, message, kind = 'error') {
  if (!element) return;
  element.textContent = message;
  element.className = `inline-alert ${kind}`;
  element.hidden = false;
}

export function hideInlineAlert(element) { if (element) element.hidden = true; }
export function showAppAlert(element, message, kind = 'error') { if (!element) return; element.textContent = message; element.className = `app-alert ${kind}`; element.hidden = false; }
export function hideAppAlert(element) { if (element) element.hidden = true; }

export function showToast(element, message, kind = '') {
  if (!element) return;
  element.textContent = message;
  element.className = `toast ${kind}`;
  element.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { element.hidden = true; }, 4000);
}

export function renderProfileHeader(profile) {
  const headerAvatar = document.querySelector('#header-avatar');
  const headerName = document.querySelector('#header-user-name');
  if (headerAvatar) headerAvatar.outerHTML = avatarMarkup(profile, 'avatar avatar-small');
  if (headerName) headerName.textContent = profile?.full_name || 'Account';
  const menu = document.querySelector('#account-menu-content');
  if (menu) menu.innerHTML = `<div class="account-summary">${avatarMarkup(profile)}<div><strong>${escapeHtml(profile?.full_name || 'Class member')}</strong><span>${escapeHtml(profile?.email || '')}</span></div></div>`;
}

export function renderEpisodeContent(container, content) {
  if (!container) return;
  container.innerHTML = content.map((block) => block.type === 'dialogue'
    ? `<div class="dialogue"><span class="dialogue-speaker">${escapeHtml(block.speaker)}</span><span>${escapeHtml(block.text)}</span></div>`
    : `<p>${escapeHtml(block.text)}</p>`).join('');
}
