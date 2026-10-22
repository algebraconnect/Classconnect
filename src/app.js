import { APP_CONFIG } from './config.js';
import { getIdentityDetails, getSession, onAuthChange, signInWithGoogle, signOut } from './auth.js';
import { bootstrapAdmin, getEpisode, getMyProfile, listEpisodes } from './supabase.js';
import { EPISODE_CONTENT, parseEpisodeBody } from './content.js';
import { initAdmin } from './admin.js';
import { initDiscussion } from './discussion.js';
import { escapeHtml, hideAppAlert, hideInlineAlert, renderEpisodeContent, renderProfileHeader, showAppAlert, showElement, showInlineAlert, showToast } from './ui.js';

const dom = {
  loginView: document.querySelector('#login-view'),
  appView: document.querySelector('#app-view'),
  loginButton: document.querySelector('#google-sign-in'),
  loginAlert: document.querySelector('#login-alert'),
  appAlert: document.querySelector('#app-alert'),
  toast: document.querySelector('#toast'),
  accountToggle: document.querySelector('#account-toggle'),
  accountMenu: document.querySelector('#account-menu'),
  signOut: document.querySelector('#sign-out'),
  readView: document.querySelector('#read-view'),
  adminView: document.querySelector('#admin-view'),
  adminNav: document.querySelector('#admin-nav'),
};

let state = { session: null, user: null, profile: null, episode: null, episodes: [], adminReady: false };

function setLoading(button, loading, label) {
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading ? `<span class="spinner"></span>${label}` : 'Continue with Google';
}

function showLogin() {
  showElement(dom.loginView, true); showElement(dom.appView, false); state = { session: null, user: null, profile: null, episode: null, episodes: [], adminReady: false };
}

function showApp() { showElement(dom.loginView, false); showElement(dom.appView, true); }

function renderEpisodePicker() {
  const picker = document.querySelector('#episode-picker');
  if (!picker) return;
  picker.innerHTML = state.episodes.map((episode, index) => `<option value="${escapeHtml(episode.slug)}">${String(index + 1).padStart(2, '0')} · ${escapeHtml(episode.title)}</option>`).join('');
  picker.value = state.episode?.slug || '';
}

function renderEpisodeDetails() {
  const episode = state.episode;
  if (!episode) return;
  const index = Math.max(0, state.episodes.findIndex((item) => item.id === episode.id));
  document.querySelector('#episode-number').textContent = String(index + 1).padStart(2, '0');
  document.querySelector('#episode-sidebar-title').textContent = episode.title;
  document.querySelector('#page-title').textContent = episode.title;
  document.querySelector('#episode-kicker').textContent = episode.title;
  document.querySelector('#episode-title').textContent = `Episode ${index + 1}`;
  document.querySelector('#episode-badge').textContent = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(episode.created_at));
  document.querySelector('#episode-endnote').textContent = `End of Episode ${index + 1}`;
  renderEpisodeContent(document.querySelector('#episode-content'), parseEpisodeBody(episode.body));
  renderEpisodePicker();
}

async function loadEpisodes(preferredSlug = 'episode-one') {
  state.episodes = await listEpisodes();
  const next = state.episodes.find((episode) => episode.slug === preferredSlug) || state.episodes[0];
  if (!next) return;
  state.episode = next;
  renderEpisodeDetails();
  await initDiscussion({ episodeId: next.id, profile: state.profile, toast: dom.toast });
}

function setRoute(route) {
  const target = route === 'admin' && state.profile?.role === 'admin' && state.profile?.approval_status === 'approved' ? 'admin' : 'read';
  showElement(dom.readView, target === 'read'); showElement(dom.adminView, target === 'admin');
  document.querySelectorAll('[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === target));
  if (target === 'admin' && !state.adminReady) { state.adminReady = true; initAdmin(state.profile).catch((error) => showInlineAlert(document.querySelector('#admin-alert'), error.message || 'The admin desk could not load.')); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function hydrateApp(session) {
  state.session = session; state.user = session.user;
  showApp();
  try {
    if (session.user.email?.toLowerCase() === APP_CONFIG.bootstrapEmail) await bootstrapAdmin();
    state.profile = await getMyProfile(session.user.id);
    if (!state.profile) throw new Error('Your profile is still being created. Please refresh in a moment.');
    renderProfileHeader({ ...state.profile, email: state.user.email || state.profile.email, avatar_url: state.profile.avatar_url || getIdentityDetails(state.user).avatarUrl });
    dom.adminNav.hidden = !(state.profile.role === 'admin' && state.profile.approval_status === 'approved');
    state.episodes = await listEpisodes();
    state.episode = state.episodes.find((episode) => episode.slug === 'episode-one') || await getEpisode();
    if (state.episode) renderEpisodeDetails();
    await initDiscussion({ episodeId: state.episode?.id || 'local-episode-one', profile: state.profile, toast: dom.toast });
    if (!state.episode) showAppAlert(dom.appAlert, 'The reading is shown from the supplied project content. Run the Supabase setup migration to enable persisted discussion.', 'info'); else hideAppAlert(dom.appAlert);
    setRoute(window.location.hash.slice(2) || 'read');
  } catch (error) {
    showAppAlert(dom.appAlert, `Degraded read-only preview: live account or class data could not be loaded. ${error.message || 'Check the Supabase setup steps.'}`, 'error');
    renderEpisodeContent(document.querySelector('#episode-content'), EPISODE_CONTENT);
    const fallbackProfile = { id: state.user.id, full_name: getIdentityDetails(state.user).name, email: state.user.email, approval_status: 'pending', role: 'student' };
    state.profile = fallbackProfile;
    renderProfileHeader(fallbackProfile);
    await initDiscussion({ episodeId: 'local-episode-one', profile: fallbackProfile, toast: dom.toast });
    setRoute('read');
  }
}

async function handleSignIn() {
  hideInlineAlert(dom.loginAlert); setLoading(dom.loginButton, true, 'Opening Google');
  try { await signInWithGoogle(); }
  catch (error) { setLoading(dom.loginButton, false); showInlineAlert(dom.loginAlert, error.message || 'Google sign-in could not start.'); }
}

async function handleSignOut() {
  dom.accountMenu.hidden = true;
  try { await signOut(); showLogin(); }
  catch (error) { showToast(dom.toast, error.message || 'Could not sign out.', 'error'); }
}

dom.loginButton?.addEventListener('click', handleSignIn);
dom.signOut?.addEventListener('click', handleSignOut);
dom.accountToggle?.addEventListener('click', () => { dom.accountMenu.hidden = !dom.accountMenu.hidden; dom.accountToggle.setAttribute('aria-expanded', String(!dom.accountMenu.hidden)); });
document.addEventListener('click', (event) => { if (!event.target.closest('.header-actions')) { dom.accountMenu.hidden = true; dom.accountToggle?.setAttribute('aria-expanded', 'false'); } });
window.addEventListener('hashchange', () => setRoute(window.location.hash.slice(2) || 'read'));
document.querySelector('#episode-picker')?.addEventListener('change', (event) => loadEpisodes(event.target.value).catch((error) => showToast(dom.toast, error.message || 'Could not open that episode.', 'error')));
window.addEventListener('classconnect:episodes-changed', () => loadEpisodes(state.episode?.slug || 'episode-one').catch((error) => showToast(dom.toast, error.message || 'Could not refresh episodes.', 'error')));

onAuthChange((session) => { if (session) hydrateApp(session); else showLogin(); });

try { const session = await getSession(); if (session) await hydrateApp(session); else showLogin(); }
catch (error) { showLogin(); showInlineAlert(dom.loginAlert, error.message || 'The sign-in service is unavailable.'); }
