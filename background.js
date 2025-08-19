// Background Service Worker for LinkedIn Company Carousel Extension

class BackgroundManager {
  constructor() {
    this.activeTab = null;
    this.carouselTabs = new Set();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle extension icon clicks - now handled by popup
    // chrome.action.onClicked.addListener((tab) => {
    //   this.handleIconClick(tab);
    // });

    // Handle messages from content scripts and display tabs
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url.includes('linkedin.com/company/')) {
        console.log('LinkedIn company page loaded:', tab.url);
      }
    });

    // Clean up closed carousel tabs
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.carouselTabs.delete(tabId);
    });

    // Periodic cleanup of expired data
    this.scheduleCleanup();
  }

  async handleIconClick(tab) {
    console.log('Extension icon clicked on tab:', tab.url);

    try {
      // Check if we're on a LinkedIn company page
      if (!tab.url.includes('linkedin.com/company/')) {
        await this.showNotification('Please navigate to a LinkedIn company page first');
        return;
      }

      // Check if content script is ready
      const isReady = await this.pingContentScript(tab.id);
      if (!isReady) {
        await this.showNotification('Page not ready. Please refresh and try again.');
        return;
      }

      // Check company page status
      const companyPageInfo = await this.getCompanyPageInfo(tab.id);
      if (!companyPageInfo.isCompanyPage) {
        await this.showNotification('Please navigate to a LinkedIn company page');
        return;
      }

      // Extract posts
      console.log('Extracting posts from company page...');
      const extractionResult = await this.extractPosts(tab.id);

      if (!extractionResult.success || extractionResult.posts.length === 0) {
        await this.showNotification(
          extractionResult.error || 'No posts found for this company'
        );
        return;
      }

      console.log(`Successfully extracted ${extractionResult.posts.length} posts`);

      // Open carousel display
      await this.openCarouselDisplay(extractionResult);

    } catch (error) {
      console.error('Error handling icon click:', error);
      await this.showNotification('An error occurred. Please try again.');
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Background received message:', message);

    try {
      switch (message.action) {
        case 'openOverlay':
          await this.openCarouselOverlayWithSettings(message.data, message.settings);
          sendResponse({ success: true });
          break;

        case 'getCompanyData':
          const data = await this.getStoredCompanyData(message.companyId);
          sendResponse({ success: true, data });
          break;

        case 'clearCache':
          await this.clearStorageCache();
          sendResponse({ success: true });
          break;

        case 'getStorageUsage':
          const usage = await this.getStorageUsage();
          sendResponse({ success: true, usage });
          break;

        // REMOVED: Video URL functionality

        case 'ping':
          sendResponse({ status: 'background-ready' });
          break;

        default:
          console.warn('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async pingContentScript(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return response && response.status === 'ready';
    } catch (error) {
      console.error('Content script not ready:', error);
      return false;
    }
  }

  async getCompanyPageInfo(tabId) {
    try {
      return await chrome.tabs.sendMessage(tabId, { action: 'checkCompanyPage' });
    } catch (error) {
      console.error('Error getting company page info:', error);
      return { isCompanyPage: false };
    }
  }

  async extractPosts(tabId) {
    try {
      return await chrome.tabs.sendMessage(tabId, { action: 'extractPosts' });
    } catch (error) {
      console.error('Error extracting posts:', error);
      return { success: false, error: error.message, posts: [] };
    }
  }

  async openCarouselOverlayWithSettings(extractionResult, settings = {}) {
    try {
      // Store the data temporarily for content script injection
      const sessionKey = `session_${Date.now()}`;
      const sessionData = {
        posts: extractionResult.posts,
        companyName: extractionResult.companyName,
        companyLogo: extractionResult.companyLogo,
        companyCoverImage: extractionResult.companyCoverImage,
        settings: settings,
        timestamp: Date.now()
      };
      
      console.log(`Storing session data with key: ${sessionKey}`, sessionData);
      await chrome.storage.local.set({ [sessionKey]: sessionData });
      
      // Verify the data was stored
      const verification = await chrome.storage.local.get([sessionKey]);
      if (!verification[sessionKey]) {
        throw new Error('Failed to store session data');
      }
      console.log('Session data verified in storage');

      // Wait a moment to ensure storage is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Inject the carousel overlay into the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject CSS first
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['display/overlay.css']
      });
      
      // Inject the no-video overlay script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['display/overlay-no-video.js']
      });
      
      // Initialize the overlay with session key
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (sessionKey) => {
          window.carouselSessionKey = sessionKey;
          if (typeof window.initNoVideoCarouselOverlay === 'function') {
            window.initNoVideoCarouselOverlay(sessionKey);
          } else {
            console.error('initNoVideoCarouselOverlay function not found');
          }
        },
        args: [sessionKey]
      });

      console.log('Carousel overlay injected into current tab');
      return tab;

    } catch (error) {
      console.error('Error opening carousel overlay:', error);
      throw error;
    }
  }


  // REMOVED: Notification functionality to reduce permissions

  async getStoredCompanyData(companyId) {
    try {
      const key = `company_${companyId}`;
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      console.error('Error getting stored data:', error);
      return null;
    }
  }

  async clearStorageCache() {
    try {
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = [];

      for (const key of Object.keys(allData)) {
        if (key.startsWith('company_') || key.startsWith('media_')) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleared ${keysToRemove.length} cached items`);
      }

      return keysToRemove.length;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async getStorageUsage() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
      
      return {
        used: bytesInUse,
        total: quota,
        percentage: Math.round((bytesInUse / quota) * 100)
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  // REMOVED: Video capture functionality (videos are excluded from carousel)

  // REMOVED: Video URL processing (no longer needed)

  scheduleCleanup() {
    // Run cleanup every hour
    const cleanupInterval = 60 * 60 * 1000; // 1 hour

    setInterval(async () => {
      try {
        await this.cleanupExpiredData();
        await this.cleanupSessionData();
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    }, cleanupInterval);

    // Also run cleanup on startup
    setTimeout(() => {
      this.cleanupExpiredData();
      this.cleanupSessionData();
    }, 5000);
  }

  // REMOVED: Video request cleanup (no longer needed)

  async cleanupExpiredData() {
    try {
      const allData = await chrome.storage.local.get(null);
      const now = Date.now();
      const keysToRemove = [];

      for (const [key, value] of Object.entries(allData)) {
        if (value && typeof value === 'object' && value.expiresAt) {
          if (now > value.expiresAt) {
            keysToRemove.push(key);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} expired items`);
      }
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }

  async cleanupSessionData() {
    try {
      const allData = await chrome.storage.local.get(null);
      const now = Date.now();
      const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
      const keysToRemove = [];

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('session_') && value && value.timestamp) {
          if (now - value.timestamp > sessionTimeout) {
            keysToRemove.push(key);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} old session items`);
      }
    } catch (error) {
      console.error('Error cleaning up session data:', error);
    }
  }

  // Utility method for safe message sending
  async safeMessageSend(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        console.warn('Content script not available in tab', tabId);
        return null;
      }
      throw error;
    }
  }
}

// Initialize the background manager
const backgroundManager = new BackgroundManager();

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('LinkedIn Company Carousel Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});