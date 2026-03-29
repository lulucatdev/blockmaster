/**
 * BlockMaster Popup Script
 * Handles settings UI and session statistics
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Default settings
  const defaultSettings = {
    removeAfterBlock: true,
    showNotification: true,
    keyboardShortcut: true,
  };

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['blockmasterSettings']);
      return { ...defaultSettings, ...result.blockmasterSettings };
    } catch (e) {
      console.error('Failed to load settings:', e);
      return defaultSettings;
    }
  }

  // Save settings to storage
  async function saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ blockmasterSettings: settings });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // Load blocked count from active tab's content script
  async function getSessionStats() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && (tab.url?.includes('x.com') || tab.url?.includes('twitter.com'))) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStats' });
        return response || { blockedCount: 0 };
      }
    } catch (e) {
      // Content script not loaded or no response
    }
    return { blockedCount: 0 };
  }

  // Toggle switch handler
  function setupToggle(id, settingKey, settings) {
    const toggle = document.getElementById(id);
    if (!toggle) return;

    // Set initial state
    if (settings[settingKey]) {
      toggle.classList.add('active');
    }

    // Handle click - clone settings before mutating
    toggle.addEventListener('click', async () => {
      const isActive = toggle.classList.toggle('active');
      const newSettings = { ...settings, [settingKey]: isActive };
      // Update local reference
      Object.assign(settings, newSettings);
      await saveSettings(newSettings);
    });
  }

  // Initialize
  const settings = await loadSettings();
  const stats = await getSessionStats();

  // Update stats display
  document.getElementById('blockedCount').textContent = stats.blockedCount || 0;

  // Setup toggles
  setupToggle('removeToggle', 'removeAfterBlock', settings);
  setupToggle('notifyToggle', 'showNotification', settings);
  setupToggle('keyboardToggle', 'keyboardShortcut', settings);
});
