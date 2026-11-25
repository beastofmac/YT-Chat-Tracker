/**
 * Background Service Worker for YouTube Live Chat Read Tracker
 * Handles extension lifecycle and cross-tab communication
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[YT Chat Read Tracker] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.local.set({
      'yt_chat_read_tracker_enabled': true,
      'yt_chat_read_tracker_version': chrome.runtime.getManifest().version
    });
  } else if (details.reason === 'update') {
    console.log('[YT Chat Read Tracker] Extension updated to:', chrome.runtime.getManifest().version);
    // Handle migration if needed
    chrome.storage.local.set({
      'yt_chat_read_tracker_version': chrome.runtime.getManifest().version
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getExtensionStatus':
      sendResponse({
        enabled: true,
        version: chrome.runtime.getManifest().version
      });
      break;

    case 'clearAllData':
      // Clear all storage for this extension
      chrome.storage.local.clear().then(() => {
        sendResponse({ success: true });
      });
      return true; // Async

    case 'getAllSessions':
      chrome.storage.local.get(null).then((data) => {
        const sessions = Object.entries(data)
          .filter(([key]) => key.startsWith('yt_chat_read_'))
          .map(([key, value]) => ({
            key,
            videoId: value.videoId,
            messageCount: value.readMessages?.length || 0,
            updatedAt: value.updatedAt
          }));
        sendResponse({ sessions });
      });
      return true; // Async

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle tab updates to detect YouTube Live Chat pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isLiveChat = tab.url.includes('youtube.com/live_chat') ||
                       tab.url.includes('youtube.com/live_chat_replay');

    if (isLiveChat) {
      // Content script will auto-initialize via content_scripts match
      console.log('[YT Chat Read Tracker] Live Chat page detected:', tab.url);
    }
  }
});

// Handle extension icon click (if we add a popup later)
chrome.action.onClicked.addListener((tab) => {
  // This fires if no popup is defined
  // Could open a simple status page or toggle
  console.log('[YT Chat Read Tracker] Extension icon clicked');
});

// Periodic cleanup of old storage data (runs daily)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
let cleanupAlarm = null;

function scheduleCleanup() {
  if (cleanupAlarm) {
    clearTimeout(cleanupAlarm);
  }
  cleanupAlarm = setTimeout(async () => {
    await performCleanup();
    scheduleCleanup(); // Reschedule
  }, CLEANUP_INTERVAL);
}

async function performCleanup() {
  try {
    const data = await chrome.storage.local.get(null);
    const sessionKeys = Object.keys(data).filter(key => key.startsWith('yt_chat_read_'));

    if (sessionKeys.length > 50) {
      // Sort by update time
      const sessions = sessionKeys.map(key => ({
        key,
        updatedAt: data[key]?.updatedAt || 0
      })).sort((a, b) => b.updatedAt - a.updatedAt);

      // Keep only 30 most recent
      const toDelete = sessions.slice(30).map(s => s.key);
      if (toDelete.length > 0) {
        await chrome.storage.local.remove(toDelete);
        console.log(`[YT Chat Read Tracker] Background cleanup: removed ${toDelete.length} old sessions`);
      }
    }
  } catch (error) {
    console.warn('[YT Chat Read Tracker] Background cleanup failed:', error);
  }
}

// Start cleanup scheduler
scheduleCleanup();

// Clean up on shutdown
chrome.runtime.onSuspend.addListener(() => {
  if (cleanupAlarm) {
    clearTimeout(cleanupAlarm);
  }
});

console.log('[YT Chat Read Tracker] Background service worker started');