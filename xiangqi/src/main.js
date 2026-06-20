// Xiangqi Frontend — Phase 1 (Vite bundled entry point)
// Imports from existing scripts/ modules and new SEO/monitoring modules

// ============= MONITORING & SEO =============
// Initialize Web Vitals tracking (Phase 1)
import { initWebVitals } from './monitoring/web-vitals.js';
// Initialize Sentry error tracking (Phase 1)
import { initSentry } from './monitoring/sentry-init.js';
// Initialize dynamic meta tags for SEO (Phase 1)
import { initMetaInjector } from './seo/meta-injector.js';

// ============= CORE GAME LOGIC =============
import * as theme from '../scripts/theme/theme.js';
import * as i18n from '../scripts/i18n/i18n.js';
import { t } from '../scripts/i18n/i18n.js';

// ============= UI COMPONENTS =============
import { openAIModal } from '../scripts/ui/ai-modal.js';
import { openFindMatchModal } from '../scripts/ui/find-match-modal.js';
import { openAuthModal } from '../scripts/ui/auth-modal.js';
import { GameController } from '../scripts/ui/game-controller.js';
import { getProfile, getSettings, setSettings, getGameSession, clearGameSession } from '../scripts/storage/local.js';
import { getRank } from '../scripts/elo/elo.js';
import { renderSettingsPage } from '../scripts/ui/settings-page.js';
import { renderHistoryPage } from '../scripts/ui/history-page.js';
import { renderReplayPage } from '../scripts/ui/replay-page.js';
import { renderProfilePage } from '../scripts/ui/profile-page.js';
import { renderDailyPage } from '../scripts/ui/daily-page.js';
import { renderDailyChessPage } from '../scripts/ui/daily-chess-page.js';
import { getStreak, getLevel, getDailyProgress, dateKey } from '../scripts/puzzles/chess-bank.js';
import { renderLeaderboardPage } from '../scripts/ui/leaderboard-page.js';
import { renderCreateRoomPage } from '../scripts/ui/create-room-page.js';
import { renderOnlinePage } from '../scripts/ui/online-page.js';
import { renderTournamentPage } from '../scripts/ui/tournament-page.js';
import { setEnabled as setSoundEnabled } from '../scripts/sound/sound.js';
import { isAuthed, getUser, onAuthChange, logout, loadMe } from '../scripts/net/api.js';
import { toast } from '../scripts/ui/toast.js';

// ============= ACCESSIBILITY (Phase 1) =============
import { initA11y } from './a11y/wcag-init.js';

// ============= CSS =============
import './styles/main.css';

let currentGame = null;

// Initialize all Phase 1 features
async function initPhase1() {
  // Initialize error tracking (production only)
  if (import.meta.env.PROD) {
    initSentry();
  }

  // Initialize Web Vitals collection
  initWebVitals();

  // Initialize dynamic SEO meta tags
  initMetaInjector();

  // Initialize accessibility features
  initA11y();
}

// Initialize Google Sign In
function initGoogleSignIn() {
  if (!window.google?.accounts?.id) {
    console.warn('Google Sign In SDK not loaded yet');
    setTimeout(initGoogleSignIn, 500);
    return;
  }

  window.google.accounts.id.initialize({
    client_id: '8628113689-u891ob67bfnricdbjlmtti91dma0uokt.apps.googleusercontent.com',
    callback: window.handleGoogleSignInResponse,
  });
}

function boot() {
  // Initialize Phase 1 features
  initPhase1();

  theme.init();
  i18n.init();
  i18n.applyToDocument();

  // Initialize Google Sign In
  initGoogleSignIn();

  const s = getSettings();
  if (s.soundEnabled) {
    setSoundEnabled(true);
  }

  // Main content div
  const mainDiv = document.querySelector('main') || (() => {
    const m = document.createElement('main');
    document.body.appendChild(m);
    return m;
  })();

  // Hash router
  async function route() {
    const hash = window.location.hash.slice(1).split('?')[0];
    const [page, ...args] = hash.split('/');

    mainDiv.innerHTML = '';

    try {
      switch (page) {
        case '':
        case 'home':
          return renderHomePage();

        case 'play':
          return renderPlayPage();

        case 'ai':
          openAIModal();
          return;

        case 'find-match':
        case 'multiplayer':
          openFindMatchModal();
          return;

        case 'game':
          if (!args[0]) {
            window.location.hash = '#home';
            return;
          }
          return renderGamePage(args[0]);

        case 'replay':
          return renderReplayPage(args[0]);

        case 'history':
          return renderHistoryPage();

        case 'profile':
          return renderProfilePage(args[0]);

        case 'leaderboard':
          return renderLeaderboardPage();

        case 'settings':
          return renderSettingsPage();

        case 'daily':
          return renderDailyPage();

        case 'daily-chess':
          return renderDailyChessPage();

        case 'online':
          return renderOnlinePage();

        case 'tournament':
          return renderTournamentPage();

        case 'puzzle':
          return renderDailyChessPage();

        default:
          renderHomePage();
      }
    } catch (e) {
      console.error('Route error:', e);
      toast(t('error.routeFailed'), 'error');
    }
  }

  // Hash change listener
  window.addEventListener('hashchange', route);
  route();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Service Worker registration (Phase 1 v2)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}

// Placeholder: renderHomePage, renderPlayPage, renderGamePage would be imported as needed
function renderHomePage() {
  mainDiv.innerHTML = '<div class="page-loading">Loading...</div>';
}

function renderPlayPage() {
  mainDiv.innerHTML = '<div class="page-loading">Loading...</div>';
}

function renderGamePage(gameId) {
  if (currentGame) currentGame.destroy();
  currentGame = new GameController(mainDiv, gameId);
}

export { boot, currentGame };
