/**
 * Content Script - Main entry point for YouTube Live Chat Read Tracker
 * Handles initialization, message observation, and event handling
 */

(function() {
  'use strict';

  // State
  let readMessages = new Set();
  let observer = null;
  let isInitialized = false;
  let chatContainer = null;
  let lastProcessedCount = 0;
  let debounceTimer = null;

  // Configuration
  const CONFIG = {
    OBSERVER_DEBOUNCE_MS: 50,
    MAX_RETRY_ATTEMPTS: 5,
    RETRY_DELAY_MS: 500,
    CHAT_SELECTORS: [
      '#chat',
      '#chatframe',
      'yt-live-chat-renderer',
      'live-chat-renderer',
      'yt-live-chat-app',
      '#items',
      '#contents'
    ]
  };

  /**
   * Initialize the extension
   */
  async function initialize() {
    if (isInitialized) return;

    console.log('[YT Chat Read Tracker] Initializing...');

    try {
      // Load read messages from storage
      readMessages = await StorageManager.loadReadMessages();
      console.log(`[YT Chat Read Tracker] Loaded ${readMessages.size} read messages`);

      // Find chat container
      chatContainer = findChatContainer();
      if (!chatContainer) {
        console.warn('[YT Chat Read Tracker] Chat container not found, retrying...');
        await waitForChatContainer();
        chatContainer = findChatContainer();
      }

      if (chatContainer) {
        console.log('[YT Chat Read Tracker] Chat container found:', chatContainer.tagName);

        // Process existing messages
        await processExistingMessages();

        // Start observing for new messages
        startObserver();

        isInitialized = true;
        console.log('[YT Chat Read Tracker] Initialization complete');
      } else {
        console.error('[YT Chat Read Tracker] Could not find chat container after retries');
        // Try again later
        setTimeout(initialize, 2000);
      }
    } catch (error) {
      console.error('[YT Chat Read Tracker] Initialization error:', error);
      setTimeout(initialize, 2000);
    }
  }

  /**
   * Find the chat container element
   * @returns {Element|null} Chat container or null
   */
  function findChatContainer() {
    for (const selector of CONFIG.CHAT_SELECTORS) {
      const container = document.querySelector(selector);
      if (container) return container;
    }

    // Fallback: look for any element containing message renderers
    const messageRenderers = document.querySelectorAll(MessageManager.SELECTORS.MESSAGE_RENDERER);
    if (messageRenderers.length > 0) {
      return messageRenderers[0].closest('[id], [class*="chat"], [class*="Chat"]') || document.body;
    }

    return null;
  }

  /**
   * Wait for chat container to appear
   * @returns {Promise<void>}
   */
  function waitForChatContainer() {
    return new Promise((resolve) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (findChatContainer() || attempts >= CONFIG.MAX_RETRY_ATTEMPTS) {
          clearInterval(checkInterval);
          resolve();
        }
      }, CONFIG.RETRY_DELAY_MS);
    });
  }

  /**
   * Process all existing messages in the chat
   */
  async function processExistingMessages() {
    const messages = MessageManager.findAllMessages();
    console.log(`[YT Chat Read Tracker] Processing ${messages.length} existing messages`);

    MessageManager.processMessages(messages, readMessages);
    lastProcessedCount = messages.length;
  }

  /**
   * Start MutationObserver to detect new messages
   */
  function startObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    console.log('[YT Chat Read Tracker] MutationObserver started');
  }

  /**
   * Handle DOM mutations
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  function handleMutations(mutations) {
    // Debounce to batch multiple mutations
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      processNewMessages(mutations);
    }, CONFIG.OBSERVER_DEBOUNCE_MS);
  }

  /**
   * Process new messages from mutations
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  function processNewMessages(mutations) {
    const newMessageElements = [];

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Direct message renderer
            if (MessageManager.isSupportedMessage(node)) {
              newMessageElements.push(node);
            }
            // Message renderer inside added subtree
            const renderers = node.querySelectorAll?.(MessageManager.SELECTORS.MESSAGE_RENDERER);
            if (renderers) {
              renderers.forEach(el => newMessageElements.push(el));
            }
          }
        });
      }
    }

    if (newMessageElements.length > 0) {
      console.log(`[YT Chat Read Tracker] Detected ${newMessageElements.length} new messages`);
      MessageManager.processMessages(newMessageElements, readMessages);
      lastProcessedCount += newMessageElements.length;
    }
  }

  /**
   * Handle checkbox click events (event delegation)
   * @param {Event} event - Click event
   */
  async function handleCheckboxClick(event) {
    const result = MessageManager.handleCheckboxClick(event);
    if (!result) return;

    const { messageId, isRead, messageElement } = result;

    try {
      if (isRead) {
        await StorageManager.markAsRead(messageId);
        readMessages.add(messageId);
        console.log(`[YT Chat Read Tracker] Marked as read: ${messageId}`);
      } else {
        await StorageManager.markAsUnread(messageId);
        readMessages.delete(messageId);
        console.log(`[YT Chat Read Tracker] Marked as unread: ${messageId}`);
      }
    } catch (error) {
      console.error('[YT Chat Read Tracker] Failed to update storage:', error);
      // Revert UI on failure
      const newState = !isRead;
      MessageManager.updateCheckboxState(messageElement, newState);
      MessageManager.applyReadStyling(messageElement, newState);
    }
  }

  /**
   * Handle page navigation (YouTube SPA navigation)
   */
  function handleNavigation() {
    console.log('[YT Chat Read Tracker] Navigation detected, reinitializing...');
    cleanup();
    // Small delay to let YouTube finish navigation
    setTimeout(initialize, 500);
  }

  /**
   * Clean up observers and event listeners
   */
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    isInitialized = false;
    lastProcessedCount = 0;
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Checkbox clicks (event delegation on document)
    document.addEventListener('click', handleCheckboxClick, true);

    // Listen for YouTube SPA navigation
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handleNavigation();
      }
    }, 1000);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(urlCheckInterval);
      cleanup();
    });

    // Handle visibility change (tab focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && isInitialized) {
        // Re-process in case messages were added while tab was hidden
        processExistingMessages();
      }
    });
  }

  /**
   * Handle messages from popup or background script
   */
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getStats':
          StorageManager.getStorageStats().then(stats => {
            sendResponse({ success: true, stats });
          });
          return true; // Async response

        case 'clearSession':
          StorageManager.clearCurrentSession().then(() => {
            readMessages.clear();
            MessageManager.reprocessAllMessages(readMessages);
            sendResponse({ success: true });
          });
          return true;

        case 'reprocess':
          processExistingMessages().then(() => {
            sendResponse({ success: true });
          });
          return true;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      setupMessageListener();
      initialize();
    });
  } else {
    setupEventListeners();
    setupMessageListener();
    initialize();
  }

  // Expose for debugging
  window.YTChatReadTracker = {
    initialize,
    cleanup,
    processExistingMessages,
    getReadMessages: () => readMessages,
    getStats: StorageManager.getStorageStats,
    clearSession: StorageManager.clearCurrentSession
  };

})();