// SEO Meta Tags Injector — dynamically update OG tags based on route
// Phase 1: Dynamic player profiles + game cards

const API_BASE = document.querySelector('meta[name="xq-api-base"]')?.content || 'https://xiangqi.games-core.com';

// Default meta tags (homepage)
const DEFAULT_META = {
  title: 'Cờ Tướng Vương - Play Xiangqi Online | AI & Multiplayer',
  description: 'Play Xiangqi online with 10-level AI, real players, ELO ranking, blind & standard variants, tournament mode.',
  image: `${API_BASE}/og-image.svg`,
  url: 'https://xiangqi.games-core.com/',
  type: 'website',
};

// Cache for fetched meta (avoid redundant API calls)
const metaCache = new Map();

async function fetchMeta(endpoint) {
  if (metaCache.has(endpoint)) {
    return metaCache.get(endpoint);
  }

  try {
    const response = await fetch(`${API_BASE}/api/seo/${endpoint}`);
    if (!response.ok) {
      console.warn(`Failed to fetch meta for ${endpoint}:`, response.status);
      return null;
    }
    const data = await response.json();
    metaCache.set(endpoint, data);
    return data;
  } catch (err) {
    console.error(`Error fetching meta for ${endpoint}:`, err);
    return null;
  }
}

function updateMetaTags(meta) {
  if (!meta) return;

  // Update Open Graph tags
  updateOrCreateTag('meta', 'property', 'og:title', meta.title);
  updateOrCreateTag('meta', 'property', 'og:description', meta.description);
  updateOrCreateTag('meta', 'property', 'og:image', meta.image);
  updateOrCreateTag('meta', 'property', 'og:url', meta.url || window.location.href);
  updateOrCreateTag('meta', 'property', 'og:type', meta.type || 'website');

  // Update standard meta tags
  updateOrCreateTag('meta', 'name', 'description', meta.description);
  updateOrCreateTag('meta', 'name', 'keywords', meta.keywords || 'xiangqi, chinese chess, cờ tướng');

  // Update Twitter Card tags
  updateOrCreateTag('meta', 'name', 'twitter:title', meta.title);
  updateOrCreateTag('meta', 'name', 'twitter:description', meta.description);
  updateOrCreateTag('meta', 'name', 'twitter:image', meta.image);

  // Update canonical URL
  updateOrCreateTag('link', 'rel', 'canonical', meta.canonical_url || meta.url);

  // Update page title
  if (meta.title) {
    document.title = meta.title;
  }

  // Update structured data (Schema.org)
  if (meta.schema) {
    updateOrCreateSchemaTag(meta.schema);
  }
}

function updateOrCreateTag(tagName, attrName, attrValue, content) {
  let tag = document.querySelector(`${tagName}[${attrName}="${attrValue}"]`);

  if (!tag) {
    tag = document.createElement(tagName);
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }

  if (tagName === 'link') {
    tag.href = content;
  } else {
    tag.content = content;
  }
}

function updateOrCreateSchemaTag(schema) {
  let scriptTag = document.querySelector('script[type="application/ld+json"][data-schema-dynamic]');

  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.type = 'application/ld+json';
    scriptTag.setAttribute('data-schema-dynamic', 'true');
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(schema);
}

async function handleRouteChange() {
  const hash = window.location.hash.slice(1).split('?')[0];
  const [page, ...args] = hash.split('/');

  // Reset to default for unmapped routes
  if (!page || page === 'home') {
    updateMetaTags(DEFAULT_META);
    return;
  }

  try {
    let meta = null;

    switch (page) {
      case 'player':
        if (args[0]) {
          meta = await fetchMeta(`player/${args[0]}`);
        }
        break;

      case 'game':
        if (args[0]) {
          meta = await fetchMeta(`game/${args[0]}`);
        }
        break;

      case 'replay':
        if (args[0]) {
          meta = await fetchMeta(`replay/${args[0]}`);
        }
        break;

      case 'leaderboard':
        meta = {
          title: 'Leaderboard - Cờ Tướng Vương',
          description: 'Top players in Xiangqi ranked by ELO rating.',
          image: DEFAULT_META.image,
          url: `${DEFAULT_META.url}#leaderboard`,
          type: 'website',
        };
        break;

      case 'tournament':
        if (args[0]) {
          meta = await fetchMeta(`tournament/${args[0]}`);
        }
        break;

      case 'puzzle':
      case 'daily':
        meta = {
          title: 'Daily Puzzle - Cờ Tướng Vương',
          description: 'Solve daily Xiangqi puzzles to improve your game.',
          image: DEFAULT_META.image,
          url: `${DEFAULT_META.url}#daily`,
          type: 'website',
        };
        break;

      default:
        // No specific meta for this route
        meta = DEFAULT_META;
    }

    if (meta) {
      updateMetaTags(meta);
    }
  } catch (err) {
    console.error('Error handling route change:', err);
    updateMetaTags(DEFAULT_META);
  }
}

export function initMetaInjector() {
  // Handle initial route
  handleRouteChange();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Log for debugging
  console.log('SEO Meta Injector initialized');
}

// Preload player profile card for sharing
export async function preloadPlayerCard(playerId) {
  return fetchMeta(`player/${playerId}`);
}

// Preload game card for sharing
export async function preloadGameCard(gameId) {
  return fetchMeta(`game/${gameId}`);
}

// Get current meta for analytics
export function getCurrentMeta() {
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    image: document.querySelector('meta[property="og:image"]')?.content || '',
    url: window.location.href,
  };
}
