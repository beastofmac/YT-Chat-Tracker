/**
 * Message Manager Module - Handles message identification, checkbox injection, and DOM updates
 */

const MessageManager = (function() {
  // CSS class names for our injected elements
  const CLASSES = {
    CHECKBOX_CONTAINER: 'yt-chat-read-checkbox-container',
    CHECKBOX: 'yt-chat-read-checkbox',
    CHECKBOX_INPUT: 'yt-chat-read-checkbox-input',
    MESSAGE_TEXT: 'yt-chat-read-message-text',
    READ_STATE: 'yt-chat-read-marked',
    PROCESSED: 'yt-chat-read-processed'
  };

  // Selectors for YouTube Live Chat message elements
  // These are based on actual YouTube DOM structure as of 2024
  const SELECTORS = {
    // Main chat message renderer
    MESSAGE_RENDERER: 'yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer, yt-live-chat-paid-sticker-renderer',
    // Message content container
    MESSAGE_CONTENT: '#content',
    // Author name
    AUTHOR_NAME: '#author-name',
    // Message text
    MESSAGE_TEXT: '#message',
    // Metadata (timestamp, etc.)
    METADATA: '#metadata',
    // Chip bar (super chat amount, etc.)
    CHIP_BAR: '#chip-bar',
    // Main message container
    MAIN_CONTAINER: '#main'
  };

  // WeakMap to track message elements and their IDs
  const messageIdMap = new WeakMap();
  // Set to track processed message elements
  const processedElements = new WeakSet();
  // Map to store message IDs for quick lookup
  const messageIdCache = new Map();

  /**
   * Generate a stable message ID from a message element
   * Uses YouTube's internal ID if available, otherwise creates a hash from content
   * @param {Element} messageElement - The message renderer element
   * @returns {string} Unique message identifier
   */
  function generateMessageId(messageElement) {
    // First, check if YouTube has a stable ID on the element
    const youtubeId = messageElement.getAttribute('id') ||
                      messageElement.dataset.messageId ||
                      messageElement.dataset.itemId;
    if (youtubeId) {
      return `yt_${youtubeId}`;
    }

    // Try to get ID from the message's internal structure
    const authorNameEl = messageElement.querySelector(SELECTORS.AUTHOR_NAME);
    const messageTextEl = messageElement.querySelector(SELECTORS.MESSAGE_TEXT);
    const timestampEl = messageElement.querySelector(SELECTORS.METADATA);

    let authorName = '';
    let messageText = '';
    let timestamp = '';

    if (authorNameEl) {
      authorName = authorNameEl.textContent?.trim() || '';
    }
    if (messageTextEl) {
      messageText = messageTextEl.textContent?.trim() || '';
    }
    if (timestampEl) {
      timestamp = timestampEl.textContent?.trim() || '';
    }

    // Create a hash from available metadata
    const content = `${authorName}|${messageText}|${timestamp}`;
    return `gen_${hashString(content)}`;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get or generate message ID for an element
   * @param {Element} messageElement - Message renderer element
   * @returns {string} Message ID
   */
  function getMessageId(messageElement) {
    if (messageIdMap.has(messageElement)) {
      return messageIdMap.get(messageElement);
    }
    const id = generateMessageId(messageElement);
    messageIdMap.set(messageElement, id);
    return id;
  }

  /**
   * Find the message text element within a message renderer
   * @param {Element} messageElement - Message renderer element
   * @returns {Element|null} Message text element
   */
  function findMessageTextElement(messageElement) {
    // Try multiple selectors for message text
    const selectors = [
      SELECTORS.MESSAGE_TEXT,
      '#message > span',
      '.message-text',
      'yt-formatted-string#message',
      '#content #message'
    ];

    for (const selector of selectors) {
      const el = messageElement.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  /**
   * Find the container where we should inject the checkbox
   * @param {Element} messageElement - Message renderer element
   * @returns {Element|null} Container element
   */
  function findCheckboxContainer(messageElement) {
    // For text messages, inject before the message content
    const contentEl = messageElement.querySelector(SELECTORS.MESSAGE_CONTENT);
    if (contentEl) return contentEl;

    // Fallback: try to find the main container
    const mainEl = messageElement.querySelector(SELECTORS.MAIN_CONTAINER);
    if (mainEl) return mainEl;

    return messageElement;
  }

  /**
   * Create the checkbox element
   * @param {string} messageId - Message ID
   * @param {boolean} isRead - Whether message is marked as read
   * @returns {HTMLLabelElement} Checkbox label element
   */
  function createCheckbox(messageId, isRead) {
    const label = document.createElement('label');
    label.className = CLASSES.CHECKBOX_CONTAINER;
    label.title = isRead ? 'Mark as unread' : 'Mark as read';
    label.setAttribute('data-message-id', messageId);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = CLASSES.CHECKBOX_INPUT;
    input.checked = isRead;
    input.setAttribute('aria-label', isRead ? 'Mark as unread' : 'Mark as read');
    input.tabIndex = -1; // Don't add to tab order

    const span = document.createElement('span');
    span.className = CLASSES.CHECKBOX;
    span.setAttribute('aria-hidden', 'true');

    label.appendChild(input);
    label.appendChild(span);

    // Prevent checkbox clicks from bubbling to YouTube's handlers
    label.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return label;
  }

  /**
   * Apply read styling to a message
   * @param {Element} messageElement - Message renderer element
   * @param {boolean} isRead - Whether to apply read styling
   */
  function applyReadStyling(messageElement, isRead) {
    const textEl = findMessageTextElement(messageElement);
    if (!textEl) return;

    if (isRead) {
      messageElement.classList.add(CLASSES.READ_STATE);
      textEl.classList.add(CLASSES.MESSAGE_TEXT);
    } else {
      messageElement.classList.remove(CLASSES.READ_STATE);
      textEl.classList.remove(CLASSES.MESSAGE_TEXT);
    }
  }

  /**
   * Update checkbox state
   * @param {Element} messageElement - Message renderer element
   * @param {boolean} isRead - Whether message is read
   */
  function updateCheckboxState(messageElement, isRead) {
    const container = messageElement.querySelector(`.${CLASSES.CHECKBOX_CONTAINER}`);
    if (!container) return;

    const input = container.querySelector(`.${CLASSES.CHECKBOX_INPUT}`);
    if (input) {
      input.checked = isRead;
      input.setAttribute('aria-label', isRead ? 'Mark as unread' : 'Mark as read');
      container.title = isRead ? 'Mark as unread' : 'Mark as read';
    }
  }

  /**
   * Inject checkbox into a message element
   * @param {Element} messageElement - Message renderer element
   * @param {boolean} isRead - Whether message is already read
   * @returns {HTMLLabelElement|null} Injected checkbox label or null if failed
   */
  function injectCheckbox(messageElement, isRead) {
    // Check if already processed
    if (processedElements.has(messageElement)) {
      // Update existing checkbox state
      updateCheckboxState(messageElement, isRead);
      applyReadStyling(messageElement, isRead);
      return messageElement.querySelector(`.${CLASSES.CHECKBOX_CONTAINER}`);
    }

    const container = findCheckboxContainer(messageElement);
    if (!container) return null;

    const messageId = getMessageId(messageElement);
    const checkbox = createCheckbox(messageId, isRead);

    // Insert at the beginning of the container (before author/message)
    if (container.firstChild) {
      container.insertBefore(checkbox, container.firstChild);
    } else {
      container.appendChild(checkbox);
    }

    // Mark as processed
    processedElements.add(messageElement);
    messageElement.classList.add(CLASSES.PROCESSED);

    // Apply read styling
    applyReadStyling(messageElement, isRead);

    return checkbox;
  }

  /**
   * Remove checkbox from a message element
   * @param {Element} messageElement - Message renderer element
   */
  function removeCheckbox(messageElement) {
    const checkbox = messageElement.querySelector(`.${CLASSES.CHECKBOX_CONTAINER}`);
    if (checkbox) {
      checkbox.remove();
    }
    messageElement.classList.remove(CLASSES.PROCESSED, CLASSES.READ_STATE);
    const textEl = findMessageTextElement(messageElement);
    if (textEl) {
      textEl.classList.remove(CLASSES.MESSAGE_TEXT);
    }
    processedElements.delete(messageElement);
  }

  /**
   * Process a single message element
   * @param {Element} messageElement - Message renderer element
   * @param {Set<string>} readMessages - Set of read message IDs
   * @returns {string|null} Message ID if processed, null otherwise
   */
  function processMessage(messageElement, readMessages) {
    // Skip if not a valid message renderer
    if (!messageElement.matches(SELECTORS.MESSAGE_RENDERER)) {
      return null;
    }

    // Skip system messages, deleted messages, etc.
    if (messageElement.hasAttribute('hidden') ||
        messageElement.style.display === 'none') {
      return null;
    }

    const messageId = getMessageId(messageElement);
    const isRead = readMessages.has(messageId);

    injectCheckbox(messageElement, isRead);

    return messageId;
  }

  /**
   * Process multiple message elements
   * @param {NodeList|Array<Element>} messageElements - Message elements to process
   * @param {Set<string>} readMessages - Set of read message IDs
   * @returns {Array<string>} Array of processed message IDs
   */
  function processMessages(messageElements, readMessages) {
    const processedIds = [];
    messageElements.forEach(el => {
      const id = processMessage(el, readMessages);
      if (id) processedIds.push(id);
    });
    return processedIds;
  }

  /**
   * Find all message elements in the chat
   * @returns {NodeList} All message renderer elements
   */
  function findAllMessages() {
    return document.querySelectorAll(SELECTORS.MESSAGE_RENDERER);
  }

  /**
   * Handle checkbox toggle event
   * @param {Event} event - Click event
   * @returns {Object|null} {messageId, isRead} or null if not a checkbox click
   */
  function handleCheckboxClick(event) {
    const input = event.target.closest(`.${CLASSES.CHECKBOX_INPUT}`);
    if (!input) return null;

    const container = input.closest(`.${CLASSES.CHECKBOX_CONTAINER}`);
    if (!container) return null;

    const messageId = container.getAttribute('data-message-id');
    if (!messageId) return null;

    // Find the message element
    const messageElement = container.closest(SELECTORS.MESSAGE_RENDERER);
    if (!messageElement) return null;

    const isRead = input.checked;

    // Update styling immediately for responsive feel
    applyReadStyling(messageElement, isRead);

    return { messageId, isRead, messageElement };
  }

  /**
   * Check if an element is a message renderer we support
   * @param {Element} element - Element to check
   * @returns {boolean}
   */
  function isSupportedMessage(element) {
    return element.matches?.(SELECTORS.MESSAGE_RENDERER) ?? false;
  }

  /**
   * Re-process all messages (useful after storage changes)
   * @param {Set<string>} readMessages - Set of read message IDs
   * @returns {number} Number of messages processed
   */
  function reprocessAllMessages(readMessages) {
    const messages = findAllMessages();
    let count = 0;
    messages.forEach(el => {
      const id = getMessageId(el);
      const isRead = readMessages.has(id);
      updateCheckboxState(el, isRead);
      applyReadStyling(el, isRead);
      count++;
    });
    return count;
  }

  // Public API
  return {
    processMessage,
    processMessages,
    findAllMessages,
    handleCheckboxClick,
    isSupportedMessage,
    reprocessAllMessages,
    getMessageId,
    generateMessageId,
    applyReadStyling,
    updateCheckboxState,
    injectCheckbox,
    removeCheckbox,
    CLASSES,
    SELECTORS
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MessageManager;
}