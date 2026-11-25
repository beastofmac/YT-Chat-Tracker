/**
 * Storage Module - Handles persistent storage of read/unread message states
 * Uses chrome.storage.local for local-only persistence
 */

const StorageManager = (function() {
  const STORAGE_KEY_PREFIX = 'yt_chat_read_';
  const MAX_STORAGE_ITEMS = 10000; // Prevent unbounded growth
  const STORAGE_CLEANUP_THRESHOLD = 8000; // Clean up when approaching limit

  /**
   * Generate a storage key for a specific live stream session
   * @param {string} videoId - The YouTube video ID
   * @returns {string} Storage key
   */
  function getStorageKey(videoId) {
    return `${STORAGE_KEY_PREFIX}${videoId}`;
  }

  /**
   * Extract video ID from current URL
   * @returns {string|null} Video ID or null if not found
   */
  function extractVideoId() {
    const url = window.location.href;
    // Live chat URLs: youtube.com/live_chat?v=VIDEO_ID or youtube.com/live_chat_replay?v=VIDEO_ID
    const match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    // Embedded chat: youtube.com/live_chat?is_popout=1&v=VIDEO_ID
    const embedMatch = url.match(/[?&]v=([^&]{11})/);
    if (embedMatch) return embedMatch[1];

    return null;
  }

  /**
   * Get the current session's storage key
   * @returns {string} Storage key for current session
   */
  function getCurrentSessionKey() {
    const videoId = extractVideoId();
    return videoId ? getStorageKey(videoId) : STORAGE_KEY_PREFIX + 'unknown';
  }

  /**
   * Load read message IDs for current session
   * @returns {Promise<Set<string>>} Set of read message IDs
   */
  async function loadReadMessages() {
    try {
      const key = getCurrentSessionKey();
      const result = await chrome.storage.local.get([key]);
      const data = result[key];
      if (data && data.readMessages) {
        return new Set(data.readMessages);
      }
      return new Set();
    } catch (error) {
      console.warn('[YT Chat Read Tracker] Failed to load read messages:', error);
      return new Set();
    }
  }

  /**
   * Save read message IDs for current session
   * @param {Set<string>} readMessages - Set of read message IDs
   * @returns {Promise<void>}
   */
  async function saveReadMessages(readMessages) {
    try {
      const key = getCurrentSessionKey();
      const data = {
        readMessages: Array.from(readMessages),
        updatedAt: Date.now(),
        videoId: extractVideoId()
      };
      await chrome.storage.local.set({ [key]: data });

      // Check if we need to clean up old sessions
      await maybeCleanupOldSessions();
    } catch (error) {
      console.warn('[YT Chat Read Tracker] Failed to save read messages:', error);
    }
  }

  /**
   * Mark a single message as read
   * @param {string} messageId - Message identifier
   * @returns {Promise<void>}
   */
  async function markAsRead(messageId) {
    const readMessages = await loadReadMessages();
    readMessages.add(messageId);
    await saveReadMessages(readMessages);
  }

  /**
   * Mark a single message as unread
   * @param {string} messageId - Message identifier
   * @returns {Promise<void>}
   */
  async function markAsUnread(messageId) {
    const readMessages = await loadReadMessages();
    readMessages.delete(messageId);
    await saveReadMessages(readMessages);
  }

  /**
   * Check if a message is marked as read
   * @param {string} messageId - Message identifier
   * @returns {Promise<boolean>}
   */
  async function isRead(messageId) {
    const readMessages = await loadReadMessages();
    return readMessages.has(messageId);
  }

  /**
   * Toggle read status of a message
   * @param {string} messageId - Message identifier
   * @returns {Promise<boolean>} New read status (true = read)
   */
  async function toggleRead(messageId) {
    const readMessages = await loadReadMessages();
    const isCurrentlyRead = readMessages.has(messageId);
    if (isCurrentlyRead) {
      readMessages.delete(messageId);
    } else {
      readMessages.add(messageId);
    }
    await saveReadMessages(readMessages);
    return !isCurrentlyRead;
  }

  /**
   * Clean up old session data to prevent storage bloat
   * @returns {Promise<void>}
   */
  async function maybeCleanupOldSessions() {
    try {
      const allData = await chrome.storage.local.get(null);
      const sessionKeys = Object.keys(allData).filter(key => key.startsWith(STORAGE_KEY_PREFIX));

      if (sessionKeys.length <= 50) return; // Reasonable number of sessions

      // Sort by update time, keep most recent
      const sessions = sessionKeys.map(key => ({
        key,
        data: allData[key],
        updatedAt: allData[key]?.updatedAt || 0
      })).sort((a, b) => b.updatedAt - a.updatedAt);

      // Keep only the 30 most recent sessions
      const toDelete = sessions.slice(30).map(s => s.key);
      if (toDelete.length > 0) {
        await chrome.storage.local.remove(toDelete);
        console.log(`[YT Chat Read Tracker] Cleaned up ${toDelete.length} old sessions`);
      }
    } catch (error) {
      console.warn('[YT Chat Read Tracker] Cleanup failed:', error);
    }
  }

  /**
   * Clear all data for current session (for testing/reset)
   * @returns {Promise<void>}
   */
  async function clearCurrentSession() {
    try {
      const key = getCurrentSessionKey();
      await chrome.storage.local.remove([key]);
    } catch (error) {
      console.warn('[YT Chat Read Tracker] Clear failed:', error);
    }
  }

  /**
   * Get storage usage stats
   * @returns {Promise<Object>} Stats object
   */
  async function getStorageStats() {
    try {
      const allData = await chrome.storage.local.get(null);
      const sessionKeys = Object.keys(allData).filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      let totalMessages = 0;
      sessionKeys.forEach(key => {
        if (allData[key]?.readMessages) {
          totalMessages += allData[key].readMessages.length;
        }
      });
      return {
        sessionCount: sessionKeys.length,
        totalTrackedMessages: totalMessages,
        currentSessionKey: getCurrentSessionKey()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Public API
  return {
    loadReadMessages,
    saveReadMessages,
    markAsRead,
    markAsUnread,
    isRead,
    toggleRead,
    clearCurrentSession,
    getStorageStats,
    extractVideoId,
    getCurrentSessionKey
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}