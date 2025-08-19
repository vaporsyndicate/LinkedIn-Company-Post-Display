// Popup Script for LinkedIn Company Carousel
class PopupController {
    constructor() {
        this.settings = {
            postCount: 5,
            slideDuration: 45,
            autoPlay: true,
            textSize: 2
        };
        
        this.isCompanyPage = false;
        this.companyInfo = {};
        this.currentTab = null;
        
        this.init();
    }

    async init() {
        console.log('🎛️ Initializing popup controller');
        
        // Load saved settings
        await this.loadSettings();
        
        // Setup UI
        this.setupEventListeners();
        this.updateUI();
        
        // Check current page
        await this.checkCurrentPage();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['carouselSettings']);
            if (result.carouselSettings) {
                this.settings = { ...this.settings, ...result.carouselSettings };
                console.log('✅ Loaded settings:', this.settings);
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ carouselSettings: this.settings });
            console.log('💾 Settings saved:', this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    setupEventListeners() {
        // Settings controls
        document.getElementById('post-count').addEventListener('change', (e) => {
            this.settings.postCount = parseInt(e.target.value);
            this.saveSettings();
        });

        document.getElementById('slide-duration').addEventListener('change', (e) => {
            this.settings.slideDuration = parseInt(e.target.value);
            this.saveSettings();
        });

        document.getElementById('text-size').addEventListener('change', (e) => {
            this.settings.textSize = parseFloat(e.target.value);
            this.saveSettings();
        });

        document.getElementById('auto-play').addEventListener('change', (e) => {
            this.settings.autoPlay = e.target.checked;
            this.saveSettings();
        });

        // Action buttons
        document.getElementById('launch-btn').addEventListener('click', () => {
            this.launchCarousel();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshPosts();
        });

        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.clearCache();
        });
    }

    updateUI() {
        // Update form controls with current settings
        document.getElementById('post-count').value = this.settings.postCount;
        document.getElementById('slide-duration').value = this.settings.slideDuration;
        document.getElementById('text-size').value = this.settings.textSize;
        document.getElementById('auto-play').checked = this.settings.autoPlay;
    }

    async checkCurrentPage() {
        try {
            this.updateStatus('Checking page...', 'info');
            
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            
            if (!tab.url.includes('linkedin.com/company/')) {
                this.showNotCompanyPage();
                return;
            }

            // Check if content script is ready
            this.updateStatus('Connecting to page...', 'info');
            
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                if (response && response.status === 'ready') {
                    await this.getCompanyPageInfo();
                } else {
                    this.showContentScriptError();
                }
            } catch (error) {
                console.error('Content script not ready:', error);
                this.showContentScriptError();
            }

        } catch (error) {
            console.error('Error checking current page:', error);
            this.showError('Unable to check current page');
        }
    }

    async getCompanyPageInfo() {
        try {
            const pageInfo = await chrome.tabs.sendMessage(this.currentTab.id, { 
                action: 'checkCompanyPage' 
            });
            
            console.log('📍 Page info:', pageInfo);
            
            if (pageInfo.isCompanyPage) {
                this.isCompanyPage = true;
                this.companyInfo = pageInfo;
                this.showReadyState();
            } else {
                this.showNotCompanyPage();
            }
        } catch (error) {
            console.error('Error getting company page info:', error);
            this.showError('Failed to get page information');
        }
    }

    showReadyState() {
        this.updateStatus(`Ready to extract ${this.settings.postCount} posts`, 'success');
        
        // Enable launch button
        const launchBtn = document.getElementById('launch-btn');
        launchBtn.disabled = false;
        
        // Show company info if available
        if (this.companyInfo.companyName) {
            this.showCompanyInfo(this.companyInfo.companyName, this.companyInfo.companyLogo);
        }
        
        // Hide message section, show content
        document.getElementById('message-section').classList.add('hidden');
        document.getElementById('popup-content').classList.remove('hidden');
    }

    showNotCompanyPage() {
        this.updateStatus('Navigate to a LinkedIn company page', 'warning');
        this.showMessage('info', 'Please navigate to a LinkedIn company page to use the carousel.');
        
        // Disable launch button
        document.getElementById('launch-btn').disabled = true;
        
        // Show message, hide content
        document.getElementById('message-section').classList.remove('hidden');
        document.getElementById('popup-content').classList.add('hidden');
    }

    showContentScriptError() {
        this.updateStatus('Page not ready', 'warning');
        this.showMessage('warning', 'Please refresh the LinkedIn page and try again.');
        
        // Disable launch button
        document.getElementById('launch-btn').disabled = true;
        
        // Show refresh button in message
        const messageSection = document.getElementById('message-section');
        messageSection.innerHTML = `
            <div class="message warning">
                <span class="message-icon">⚠️</span>
                <div style="flex: 1;">
                    <div class="message-text">Page not ready. Please refresh and try again.</div>
                    <button onclick="window.location.reload()" style="
                        margin-top: 8px;
                        padding: 4px 8px;
                        background: #FBBF24;
                        color: #1D2226;
                        border: none;
                        border-radius: 4px;
                        font-size: 0.8rem;
                        cursor: pointer;
                    ">Refresh Popup</button>
                </div>
            </div>
        `;
        messageSection.classList.remove('hidden');
    }

    showError(message) {
        this.updateStatus('Error', 'error');
        this.showMessage('error', message);
        document.getElementById('launch-btn').disabled = true;
    }

    showMessage(type, text) {
        const messageSection = document.getElementById('message-section');
        const messageIcon = document.getElementById('message-icon');
        const messageText = document.getElementById('message-text');
        const message = document.getElementById('message');
        
        // Set icon based on type
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };
        
        messageIcon.textContent = icons[type] || 'ℹ️';
        messageText.textContent = text;
        message.className = `message ${type}`;
        messageSection.classList.remove('hidden');
    }

    updateStatus(text, type = 'info') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = text;
        statusElement.className = `status ${type}`;
    }

    showCompanyInfo(name, logo) {
        const companyInfo = document.getElementById('company-info');
        const companyName = document.getElementById('company-name');
        const companyLogo = document.getElementById('company-logo');
        
        companyName.textContent = name;
        
        if (logo) {
            companyLogo.src = logo;
            companyLogo.style.display = 'block';
        } else {
            companyLogo.style.display = 'none';
        }
        
        companyInfo.classList.remove('hidden');
    }

    async launchCarousel() {
        try {
            console.log('🚀 Launching carousel with settings:', this.settings);
            
            this.showLoading('Extracting posts...');
            
            // Extract posts with current settings
            const extractionResult = await chrome.tabs.sendMessage(this.currentTab.id, { 
                action: 'extractPosts',
                postCount: this.settings.postCount 
            });
            
            if (!extractionResult.success) {
                throw new Error(extractionResult.error || 'Failed to extract posts');
            }
            
            if (extractionResult.posts.length === 0) {
                throw new Error('No posts found for this company');
            }
            
            console.log(`✅ Extracted ${extractionResult.posts.length} posts`);
            
            // Launch overlay with settings
            await this.openCarouselOverlay(extractionResult);
            
            // Show success and close popup
            this.showSuccess();
            setTimeout(() => window.close(), 1000);
            
        } catch (error) {
            console.error('❌ Failed to launch carousel:', error);
            this.hideLoading();
            this.showError(error.message);
        }
    }

    async openCarouselOverlay(extractionResult) {
        // Send message to background script to open overlay
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'openOverlay',
                data: extractionResult,
                settings: this.settings
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Failed to open overlay'));
                }
            });
        });
    }

    async refreshPosts() {
        try {
            console.log('🔄 Refreshing posts...');
            
            // Clear cache for current company
            if (this.companyInfo.companyId) {
                await chrome.storage.local.remove([`company_${this.companyInfo.companyId}`]);
            }
            
            this.updateStatus('Posts refreshed', 'success');
            setTimeout(() => {
                if (this.isCompanyPage) {
                    this.updateStatus(`Ready to extract ${this.settings.postCount} posts`, 'success');
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error refreshing posts:', error);
            this.showError('Failed to refresh posts');
        }
    }

    async clearCache() {
        try {
            console.log('🗑️ Clearing cache...');
            
            // Clear all cached data
            const allData = await chrome.storage.local.get(null);
            const keysToRemove = [];
            
            for (const key of Object.keys(allData)) {
                if (key.startsWith('company_') || key.startsWith('session_') || key.startsWith('media_')) {
                    keysToRemove.push(key);
                }
            }
            
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`Cleared ${keysToRemove.length} cached items`);
            }
            
            this.updateStatus('Cache cleared', 'success');
            setTimeout(() => {
                if (this.isCompanyPage) {
                    this.updateStatus(`Ready to extract ${this.settings.postCount} posts`, 'success');
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showError('Failed to clear cache');
        }
    }

    showLoading(message) {
        const loadingSection = document.getElementById('loading-section');
        const popupContent = document.getElementById('popup-content');
        
        loadingSection.querySelector('p').textContent = message;
        loadingSection.classList.remove('hidden');
        popupContent.classList.add('hidden');
        
        this.updateStatus(message, 'info');
    }

    hideLoading() {
        const loadingSection = document.getElementById('loading-section');
        const popupContent = document.getElementById('popup-content');
        
        loadingSection.classList.add('hidden');
        popupContent.classList.remove('hidden');
    }

    showSuccess() {
        const launchBtn = document.getElementById('launch-btn');
        launchBtn.classList.add('success');
        launchBtn.innerHTML = `
            <span class="btn-text">Carousel Launched!</span>
            <span class="btn-icon">✅</span>
        `;
        
        this.updateStatus('Carousel opened successfully', 'success');
    }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.popupController = new PopupController();
    });
} else {
    window.popupController = new PopupController();
}

console.log('📦 Popup script loaded');