/**
 * BlockMaster - X/Twitter User Blocker
 * Replaces the views/analytics button with a one-click block button
 * @version 1.1.0
 */

(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    DEBUG: false,
    SELECTORS: {
      article: 'article[data-testid="tweet"]',
      analyticsButton: 'a[href*="/analytics"]',
      userNameLink: 'a[role="link"][href^="/"]',
      userNameContainer: '[data-testid="User-Name"]',
    },
    TEXT: {
      block: 'block',
      blocking: '...',
      blocked: 'blocked',
      confirmTitle: 'Confirm Block',
      confirmMessage: (username) => `Block @${username}?`,
      rateLimited: 'Rate limited. Please try again later',
      error: 'Block failed. Please retry',
      networkError: 'Network error. Please check your connection',
      blockedSuccess: (username) => `Blocked @${username}`,
    },
    API: {
      BLOCK_ENDPOINT: 'https://x.com/i/api/1.1/blocks/create.json',
      BEARER_TOKEN: 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    },
    ICON: `<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><g><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"/></g></svg>`,
  };

  // State
  const state = {
    settings: {
      removeAfterBlock: true,
      showNotification: true,
      keyboardShortcut: true, // Enable 'B' key to block focused post
    },
    session: {
      blockedCount: 0,
      lastBlockTime: 0,
      rateLimitedUntil: 0,
    },
    observer: null,
    cleanupFns: [],
    focusedPost: null, // Track currently focused post for keyboard shortcut
  };

  /**
   * Logging utility
   */
  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[BlockMaster]', ...args);
    }
  }

  /**
   * Check if current page is a timeline (not a tweet detail page)
   * Timeline: x.com/home, x.com/, x.com/following, x.com/username
   * Detail: x.com/username/status/123456789
   */
  function isTimelinePage() {
    const path = window.location.pathname;
    // Exclude status/tweet detail pages
    if (path.includes('/status/')) return false;
    // Exclude individual tweet permalinks (pattern: /username/status/123)
    if (/^\/[^\/]+\/status\/\d+/.test(path)) return false;
    return true;
  }

  /**
   * Load user settings from storage
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage?.sync?.get(['blockmasterSettings']);
      if (result?.blockmasterSettings) {
        Object.assign(state.settings, result.blockmasterSettings);
      }
    } catch (e) {
      log('Failed to load settings:', e);
    }
  }

  /**
   * Extract username from a post element
   */
  function getUsernameFromPost(postElement) {
    // First try: look for the user's profile link in the header
    const userLinks = postElement.querySelectorAll(CONFIG.SELECTORS.userNameLink);
    
    for (const link of userLinks) {
      const href = link.getAttribute('href');
      if (!href) continue;
      
      // Strip query parameters and hash
      const cleanHref = href.split('?')[0].split('#')[0];
      
      // Match pattern like /username (1-15 alphanumeric + underscore)
      // Exclude system paths like /i/, /search/, etc.
      if (/^\/[a-zA-Z0-9_]{1,15}$/.test(cleanHref)) {
        const username = cleanHref.slice(1);
        // Additional validation: ensure it's not a reserved path
        if (!['home', 'explore', 'notifications', 'messages', 'search', 'settings'].includes(username)) {
          return username;
        }
      }
    }

    // Second try: extract from data-testid="User-Name" links
    const nameContainer = postElement.querySelector(CONFIG.SELECTORS.userNameContainer);
    if (nameContainer) {
      const links = nameContainer.querySelectorAll('a[href^="/"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        // Strip query parameters and hash
        const cleanHref = href.split('?')[0].split('#')[0];
        const match = cleanHref.match(/^\/([a-zA-Z0-9_]{1,15})$/);
        if (match) return match[1];
      }
    }

    return null;
  }

  /**
   * Check if an element has already been processed
   */
  function isProcessed(element) {
    return element.hasAttribute('data-blockmaster-processed');
  }

  /**
   * Mark an element as processed
   */
  function markProcessed(element) {
    element.setAttribute('data-blockmaster-processed', 'true');
  }

  /**
   * Create the block button element
   */
  function createBlockButton(username) {
    const button = document.createElement('button');
    button.className = 'blockmaster-block-btn';
    button.setAttribute('aria-label', `block @${username}`);
    button.setAttribute('type', 'button');
    button.setAttribute('data-username', username);
    button.setAttribute('data-testid', 'blockmaster-block-btn');

    // Icon span
    const iconSpan = document.createElement('span');
    iconSpan.className = 'blockmaster-icon';
    iconSpan.innerHTML = CONFIG.ICON;

    // Text span - just "block", no username
    const textSpan = document.createElement('span');
    textSpan.className = 'blockmaster-text';
    textSpan.textContent = CONFIG.TEXT.block;

    button.appendChild(iconSpan);
    button.appendChild(textSpan);

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await handleBlockClick(button, username);
    });

    return button;
  }

  /**
   * Show confirmation dialog
   */
  function showConfirmDialog(username) {
    if (!state.settings.confirmBeforeBlock) return true;
    return confirm(CONFIG.TEXT.confirmMessage(username));
  }

  /**
   * Show notification toast with optional view button
   */
  function showNotification(message, type = 'success', username = null) {
    if (!state.settings.showNotification) return;

    // Remove existing toasts to prevent stacking
    const existingToasts = document.querySelectorAll('.blockmaster-toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `blockmaster-toast blockmaster-toast--${type}`;
    
    // Message text
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);
    
    // Add view button if username provided
    if (username) {
      const viewBtn = document.createElement('button');
      viewBtn.className = 'blockmaster-toast__btn';
      viewBtn.textContent = 'View';
      viewBtn.onclick = (e) => {
        e.stopPropagation();
        window.open(`https://x.com/${username}`, '_blank');
        toast.remove();
      };
      toast.appendChild(viewBtn);
    }
    
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('blockmaster-toast--visible');
    });

    // Auto-remove after 10 seconds
    const removeTimeout = setTimeout(() => {
      toast.classList.remove('blockmaster-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 10000);
    
    // Clear timeout if user interacts with toast
    toast.addEventListener('mouseenter', () => {
      clearTimeout(removeTimeout);
    });
  }

  /**
   * Handle the block button click
   */
  async function handleBlockClick(button, username) {
    // Check if already processing
    if (button.classList.contains('blockmaster-processing')) {
      return;
    }

    // Check rate limiting
    const now = Date.now();
    if (now < state.session.rateLimitedUntil) {
      const waitSeconds = Math.ceil((state.session.rateLimitedUntil - now) / 1000);
      showNotification(`${CONFIG.TEXT.rateLimited} (${waitSeconds}s)`, 'error');
      return;
    }

    // Update UI state
    button.classList.add('blockmaster-processing');
    const textSpan = button.querySelector('.blockmaster-text');
    const originalText = textSpan.textContent;
    textSpan.textContent = CONFIG.TEXT.blocking;

    // Get article reference before async operations
    const article = button.closest(CONFIG.SELECTORS.article);

    try {
      const result = await blockUser(username);
      
      if (result.networkError) {
        textSpan.textContent = originalText;
        button.classList.remove('blockmaster-processing');
        showNotification(CONFIG.TEXT.networkError, 'error');
        return;
      }
      
      if (result.success) {
        state.session.blockedCount++;
        state.session.lastBlockTime = Date.now();
        
        // Update button state
        textSpan.textContent = CONFIG.TEXT.blocked;
        button.classList.add('blockmaster-blocked');
        button.classList.remove('blockmaster-processing');
        
        showNotification(CONFIG.TEXT.blockedSuccess(username), 'success', username);
        log('Blocked user:', username);

        // Remove post immediately (no placeholder)
        if (article) {
          article.style.transition = 'opacity 0.3s ease';
          article.style.opacity = '0';
          setTimeout(() => {
            article.remove();
          }, 300);
        }
      } else if (result.rateLimited) {
        // Rate limited
        const retryAfter = result.retryAfter || 60;
        state.session.rateLimitedUntil = Date.now() + (retryAfter * 1000);
        textSpan.textContent = originalText;
        button.classList.remove('blockmaster-processing');
        showNotification(`${CONFIG.TEXT.rateLimited} (${retryAfter}s)`, 'error');
      } else {
        // Other error
        textSpan.textContent = originalText;
        button.classList.remove('blockmaster-processing');
        showNotification(result.error || CONFIG.TEXT.error, 'error');
        log('Block failed:', result);
      }
    } catch (error) {
      textSpan.textContent = originalText;
      button.classList.remove('blockmaster-processing');
      showNotification(CONFIG.TEXT.error, 'error');
      log('Block error:', error);
    }
  }

  /**
   * Block a user via API
   */
  async function blockUser(username) {
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
      return { success: false, error: 'Not logged in or session expired' };
    }

    try {
      const response = await fetch(CONFIG.API.BLOCK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Csrf-Token': csrfToken,
          'Authorization': `Bearer ${CONFIG.API.BEARER_TOKEN}`,
          'X-Twitter-Auth-Type': 'OAuth2Session',
          'X-Twitter-Client-Version': '0.0.1',
        },
        body: `screen_name=${encodeURIComponent(username)}&skip_status=1`,
        credentials: 'include',
      });

      if (response.status === 429) {
        // Rate limited
        const retryAfter = response.headers.get('x-rate-limit-reset');
        const resetTime = retryAfter ? parseInt(retryAfter) * 1000 : Date.now() + 60000;
        const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
        return { 
          success: false, 
          rateLimited: true, 
          retryAfter: waitSeconds,
          error: 'Rate limited'
        };
      }

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.errors?.[0]?.message || `Request failed (${response.status})` 
      };

    } catch (error) {
      // Detect network errors specifically
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { success: false, networkError: true, error: 'Network connection failed' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get CSRF token from cookies
   */
  function getCSRFToken() {
    const match = document.cookie.match(/ct0=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Process a single post/article element
   */
  function processPost(article) {
    if (!article || isProcessed(article)) return;

    // Skip if not on timeline page
    if (!isTimelinePage()) {
      log('Skipping post processing - not on timeline page');
      return;
    }

    // Find the analytics button
    const analyticsBtn = article.querySelector(CONFIG.SELECTORS.analyticsButton);
    if (!analyticsBtn) return;

    // Get username
    const username = getUsernameFromPost(article);
    if (!username) {
      log('Could not extract username from post');
      return;
    }

    // Skip self-posts (check against current user's handle if available)
    const myHandle = getMyHandle();
    if (myHandle && username.toLowerCase() === myHandle.toLowerCase()) {
      log('Skipping self-post');
      return;
    }

    // Find the button container
    const container = findButtonContainer(analyticsBtn);
    if (!container) {
      log('Could not find button container');
      return;
    }

    // Create and insert block button
    const blockBtn = createBlockButton(username);
    
    // Replace content while preserving layout
    container.innerHTML = '';
    container.appendChild(blockBtn);
    container.classList.add('blockmaster-container');

    markProcessed(article);
    log('Processed post for @', username);
  }

  /**
   * Find the appropriate button container
   */
  function findButtonContainer(analyticsBtn) {
    // Try to find the parent div that contains just this button
    const parent = analyticsBtn.closest('div[role="group"] > div');
    if (parent) return parent;

    // Fallback: find a container with flex layout
    let current = analyticsBtn.parentElement;
    while (current && current.tagName !== 'ARTICLE') {
      const style = window.getComputedStyle(current);
      if (style.display === 'flex' || style.display === 'inline-flex') {
        return current;
      }
      current = current.parentElement;
    }

    return analyticsBtn.parentElement;
  }

  /**
   * Get current user's handle from page data
   * Note: Content scripts run in isolated world, so window.__NEXT_DATA__ is not accessible.
   * We must use DOM-based extraction only.
   */
  function getMyHandle() {
    // Method 1: Extract from the account menu button using text content regex
    const accountBtn = document.querySelector('button[data-testid="SideNav_AccountSwitcher_Button"]');
    if (accountBtn) {
      const text = accountBtn.textContent;
      const match = text?.match(/@([a-zA-Z0-9_]{1,15})/);
      if (match) return match[1];
    }

    // Method 2: Extract from the primary navigation header
    const navHeader = document.querySelector('header[role="banner"]');
    if (navHeader) {
      const text = navHeader.textContent;
      const match = text?.match(/@([a-zA-Z0-9_]{1,15})/);
      if (match) return match[1];
    }

    // Method 3: Check for cookie-based hint (screen_name in cookies sometimes)
    const screenNameCookie = document.cookie.match(/screen_name=([^;]+)/);
    if (screenNameCookie) {
      return decodeURIComponent(screenNameCookie[1]);
    }

    return null;
  }

  /**
   * Scan for posts and process them
   */
  function scanPosts() {
    const articles = document.querySelectorAll(CONFIG.SELECTORS.article);
    articles.forEach(processPost);
  }

  // Batch queue for articles discovered by MutationObserver
  const articleBatchQueue = new Set();
  let batchTimeout = null;

  /**
   * Process the current batch of queued articles
   */
  function processBatch() {
    if (articleBatchQueue.size === 0) return;
    
    const articles = Array.from(articleBatchQueue);
    articleBatchQueue.clear();
    
    log(`Processing batch of ${articles.length} articles`);
    articles.forEach(processPost);
  }

  /**
   * Queue articles for batch processing
   */
  function queueArticles(articles) {
    articles.forEach(article => articleBatchQueue.add(article));
    
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    batchTimeout = setTimeout(processBatch, 50); // 50ms batching window
  }

  /**
   * Set up MutationObserver for dynamic content
   */
  function setupObserver() {
    state.observer = new MutationObserver((mutations) => {
      const newArticles = [];

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          // Quick tag check before expensive selector queries
          if (node.tagName === 'ARTICLE') {
            // Check if it's a tweet article
            if (node.hasAttribute('data-testid') && node.getAttribute('data-testid').includes('tweet')) {
              newArticles.push(node);
            }
          } else if (node.children?.length > 0) {
            // Only query if node has children and might contain articles
            // Check for article data-testid directly to avoid deep tree traversal
            const articles = node.querySelectorAll('article[data-testid="tweet"]');
            articles.forEach(article => newArticles.push(article));
          }
        });
      });

      if (newArticles.length > 0) {
        queueArticles(newArticles);
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    // Add cleanup for batch timeout
    state.cleanupFns.push(() => {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      articleBatchQueue.clear();
    });
  }

  /**
   * Initialize the extension
   */
  async function init() {
    log('Initializing BlockMaster v1.1.0');

    await loadSettings();

    // Initial scan
    scanPosts();

    // Set up observer for infinite scroll
    setupObserver();

    // Listen for settings changes
    chrome.storage?.onChanged?.addListener((changes) => {
      if (changes.blockmasterSettings?.newValue) {
        state.settings = { ...state.settings, ...changes.blockmasterSettings.newValue };
        log('Settings updated:', state.settings);
      }
    });

    // Listen for messages from popup
    chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
      if (request.action === 'getStats') {
        // Synchronous response - don't return true
        sendResponse({
          blockedCount: state.session.blockedCount,
          lastBlockTime: state.session.lastBlockTime,
        });
        return false;
      }
      
      if (request.action === 'updateSettings') {
        // Synchronous response - don't return true
        Object.assign(state.settings, request.settings);
        sendResponse({ success: true });
        return false;
      }
      
      return false; // Default: synchronous
    });

    // Log session stats periodically
    const statsInterval = setInterval(() => {
      if (state.session.blockedCount > 0) {
        log('Session stats:', state.session);
      }
    }, 60000);
    state.cleanupFns.push(() => clearInterval(statsInterval));

    // Cleanup on extension disable/update or page unload
    const cleanup = () => {
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }
      state.cleanupFns.forEach(fn => fn());
      state.cleanupFns = [];
    };

    window.addEventListener('beforeunload', cleanup);
    
    // Also cleanup when extension context becomes invalid
    const checkContextValidity = setInterval(() => {
      if (!chrome.runtime?.id) {
        log('Extension context invalidated, cleaning up');
        cleanup();
        clearInterval(checkContextValidity);
      }
    }, 1000);

    // Listen for URL changes (SPA navigation)
    // X is a single-page app, URL changes without page reload
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        log('URL changed to:', currentUrl);
        
        if (isTimelinePage()) {
          // Navigated back to timeline, resume processing
          log('Navigated to timeline, resuming processing');
          scanPosts();
        } else {
          // Navigated to detail page, skip processing
          log('Navigated to detail page, pausing processing');
        }
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });
    state.cleanupFns.push(() => urlObserver.disconnect());

    // Keyboard shortcut: Press 'B' to block the focused/visible post
    const keyboardHandler = (e) => {
      if (!state.settings.keyboardShortcut) return;
      if (e.key !== 'b' && e.key !== 'B') return;
      if (e.target.matches('input, textarea, [contenteditable]')) return; // Don't trigger when typing
      
      const focusedPost = getFocusedPost();
      if (focusedPost) {
        const blockBtn = focusedPost.querySelector('[data-testid="blockmaster-block-btn"]');
        if (blockBtn && !blockBtn.classList.contains('blockmaster-blocked')) {
          e.preventDefault();
          blockBtn.click();
          log('Blocked via keyboard shortcut');
        }
      }
    };
    document.addEventListener('keydown', keyboardHandler);
    state.cleanupFns.push(() => document.removeEventListener('keydown', keyboardHandler));
  }

  /**
   * Get the currently focused/visible post in viewport
   */
  function getFocusedPost() {
    const posts = document.querySelectorAll(CONFIG.SELECTORS.article);
    let bestPost = null;
    let bestScore = -Infinity;
    
    posts.forEach(post => {
      const rect = post.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate how centered the post is in viewport
      const postCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const distanceFromCenter = Math.abs(postCenter - viewportCenter);
      
      // Must be at least partially visible
      if (rect.bottom > 0 && rect.top < viewportHeight) {
        // Higher score for posts closer to center and larger visible area
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        const score = visibleHeight - distanceFromCenter;
        
        if (score > bestScore) {
          bestScore = score;
          bestPost = post;
        }
      }
    });
    
    return bestPost;
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
