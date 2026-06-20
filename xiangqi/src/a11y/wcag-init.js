// WCAG 2.1 AA Accessibility Features
// Phase 1: Keyboard navigation, screen reader support, motion preferences

export function initA11y() {
  // 1. Respect prefers-reduced-motion
  initMotionPreferences();

  // 2. Keyboard navigation setup
  initKeyboardNavigation();

  // 3. ARIA live regions for dynamic content
  initAriaLiveRegions();

  // 4. Focus management
  initFocusManagement();

  console.log('Accessibility features initialized (WCAG 2.1 AA)');
}

// ============= MOTION PREFERENCES =============
function initMotionPreferences() {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateMotionPreference(e) {
    const prefersReducedMotion = motionQuery.matches;
    document.documentElement.setAttribute('data-motion-preference', prefersReducedMotion ? 'reduce' : 'normal');

    if (prefersReducedMotion) {
      // Disable animations globally
      document.documentElement.style.setProperty('--transition-duration', '0ms');
      document.documentElement.style.setProperty('--animation-duration', '0ms');
    } else {
      // Re-enable animations
      document.documentElement.style.removeProperty('--transition-duration');
      document.documentElement.style.removeProperty('--animation-duration');
    }
  }

  // Initial setup
  updateMotionPreference();

  // Listen for changes (user changes OS preference)
  motionQuery.addListener(updateMotionPreference);
}

// ============= KEYBOARD NAVIGATION =============
function initKeyboardNavigation() {
  // Tab trap in modals (keep focus within modal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab backwards
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab forwards
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    // ESC to close modals/overlays
    if (e.key === 'Escape') {
      const modal = document.querySelector('[role="dialog"][open]') ||
                    document.querySelector('.modal.active');
      if (modal && modal.close) {
        modal.close();
      }
    }

    // Enter/Space to activate buttons
    if ((e.key === 'Enter' || e.key === ' ') &&
        document.activeElement.tagName === 'BUTTON') {
      e.preventDefault();
      document.activeElement.click();
    }
  });

  // Arrow key navigation for board squares
  document.addEventListener('keydown', (e) => {
    const board = document.querySelector('[data-board]');
    if (!board) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      // Board-specific arrow key handling will be added by game controller
      board.dispatchEvent(new CustomEvent('arrowkey', { detail: { key: e.key } }));
    }
  });
}

// ============= ARIA LIVE REGIONS =============
function initAriaLiveRegions() {
  // Create live regions for announcements
  const liveRegions = {
    polite: createLiveRegion('polite'),
    assertive: createLiveRegion('assertive'),
  };

  // Attach to body
  document.body.appendChild(liveRegions.polite);
  document.body.appendChild(liveRegions.assertive);

  // Expose global functions for game controller to announce moves
  window.announceA11y = (message, level = 'polite') => {
    const region = liveRegions[level];
    if (region) {
      region.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 3000);
    }
  };
}

function createLiveRegion(ariaLive) {
  const region = document.createElement('div');
  region.setAttribute('aria-live', ariaLive);
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only'; // Screen reader only, visually hidden
  region.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  return region;
}

// ============= FOCUS MANAGEMENT =============
function initFocusManagement() {
  // Focus visible indicator
  document.addEventListener('keydown', () => {
    document.body.classList.add('keyboard-nav');
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });

  // Announce page changes to screen readers
  const observer = new MutationObserver(() => {
    const heading = document.querySelector('main h1, main h2');
    if (heading) {
      announceA11y(`Page: ${heading.textContent}`, 'assertive');
    }
  });

  observer.observe(document.querySelector('main') || document.body, {
    childList: true,
    subtree: true,
  });

  // Focus first interactive element when page changes
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      const firstButton = document.querySelector('main button, main [role="button"]');
      if (firstButton) {
        firstButton.focus();
      }
    }, 100);
  });
}

// ============= ACCESSIBILITY UTILITIES =============

// Helper to make elements accessible
export function makeAccessible(element, options = {}) {
  const {
    role,
    label,
    describedBy,
    ariaLive,
    tabIndex,
  } = options;

  if (role) element.setAttribute('role', role);
  if (label) element.setAttribute('aria-label', label);
  if (describedBy) element.setAttribute('aria-describedby', describedBy);
  if (ariaLive) element.setAttribute('aria-live', ariaLive);
  if (tabIndex !== undefined) element.tabIndex = tabIndex;

  return element;
}

// Announce messages to screen readers
export function announceToScreenReader(message, level = 'polite') {
  if (window.announceA11y) {
    window.announceA11y(message, level);
  }
}

// Check if user prefers reduced motion
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check if keyboard navigation is active
export function isKeyboardNavigation() {
  return document.body.classList.contains('keyboard-nav');
}
