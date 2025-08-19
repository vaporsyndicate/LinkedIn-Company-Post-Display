// LinkedIn Company Carousel - Consolidated Content Script
// All utilities included inline to avoid loading issues

console.log('🚀 LinkedIn Company Carousel - Consolidated Content Script Loading...');

// ===== STORAGE MANAGER =====
class StorageManager {
  static EXPIRY_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  static MAX_POSTS = 5;

  static async storeCompanyData(companyId, posts) {
    try {
      const timestamp = Date.now();
      const data = {
        posts: posts.slice(0, this.MAX_POSTS),
        timestamp: timestamp,
        expiresAt: timestamp + this.EXPIRY_DURATION
      };
      
      const key = `company_${companyId}`;
      await chrome.storage.local.set({ [key]: data });
      console.log(`Stored data for company ${companyId}`);
      return true;
    } catch (error) {
      console.error('Error storing company data:', error);
      return false;
    }
  }

  static async getCompanyData(companyId) {
    try {
      const key = `company_${companyId}`;
      const result = await chrome.storage.local.get([key]);
      
      if (!result[key]) {
        return null;
      }

      const data = result[key];
      const now = Date.now();
      
      // Check if data has expired
      if (now > data.expiresAt) {
        console.log(`Data for company ${companyId} has expired`);
        await this.clearCompanyData(companyId);
        return null;
      }

      return data.posts;
    } catch (error) {
      console.error('Error retrieving company data:', error);
      return null;
    }
  }

  static async clearCompanyData(companyId) {
    try {
      const key = `company_${companyId}`;
      await chrome.storage.local.remove([key]);
      console.log(`Cleared data for company ${companyId}`);
      return true;
    } catch (error) {
      console.error('Error clearing company data:', error);
      return false;
    }
  }

  static extractCompanyId(url) {
    const match = url.match(/\/company\/([^\/\?]+)/);
    return match ? match[1] : null;
  }
}

// ===== TEXT FORMATTER =====
class TextFormatter {
  static formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInHours / 24);
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else if (diffInDays < 30) {
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `${diffInWeeks}w ago`;
      } else {
        // Format as readable date
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  }

  static cleanText(text) {
    if (!text) return '';
    
    // Clean up hashtag formatting issues (hashtag#sample -> #sample)
    let cleanedText = text.replace(/hashtag#/gi, '#');
    
    // Remove any duplicate hashtags that might appear
    cleanedText = cleanedText.replace(/##+/g, '#');
    
    // Clean up whitespace and newlines
    cleanedText = cleanedText.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    
    // Remove any other LinkedIn-specific text artifacts
    cleanedText = cleanedText.replace(/\b(hashtag)\b/gi, '');
    
    // Clean up any double spaces that might have been created
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
    
    return cleanedText;
  }
}

// ===== LINKEDIN PARSER =====
class LinkedInParser {
  static POST_SELECTORS = {
    containers: [
      '[data-id*="urn:li:activity"]',
      '.feed-shared-update-v2',
      '.occludable-update',
      'div[class*="feed-shared-update"]',
      '.feed-shared-update',
      '.update-components-feed-entry'
    ],
    
    text: [
      '.feed-shared-text',
      '.commentary',
      '[data-test-id*="text-content"]',
      'div[class*="feed-shared-text"] span[dir="ltr"]',
      '.update-components-text',
      '.feed-shared-inline-show-more-text'
    ],
    
    images: [
      '.update-components-image img',
      '.feed-shared-image__image',
      'img[class*="feed-shared-image"]',
      '[data-test-id*="image"] img',
      '.update-components-single-image img',
      '.feed-shared-external-video__image'
    ],
    
    videos: [
      'video',
      '.feed-shared-external-video',
      '.update-components-video',
      '[data-test-id*="video"]',
      '.update-components-video video',
      '.feed-shared-video',
      '.feed-shared-native-video',
      '[data-test-id="video-element"]',
      '.video-js',
      '.video-player',
      '.feed-shared-mini-update-v2 video',
      '.feed-shared-update-v2__content video',
      '.video-container',
      '.linkedin-video',
      '[data-test-id*="video-thumbnail"]',
      '.video-thumbnail',
      '.video-player-container',
      '.dss-native-video-player',
      '.artdeco-video-player'
    ],
    
    dates: [
      '.update-components-actor__sub-description',
      '.feed-shared-actor__sub-description',
      '.update-components-actor time',
      'time[datetime]',
      '.visually-hidden'
    ],
    
    authors: [
      '.update-components-actor__name',
      '.feed-shared-actor__name',
      '.update-components-actor',
      '.feed-shared-actor'
    ]
  };

  static findElements(selectors, context = document) {
    for (const selector of selectors) {
      try {
        const elements = context.querySelectorAll(selector);
        if (elements.length > 0) {
          return Array.from(elements);
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error);
      }
    }
    return [];
  }

  static findElement(selectors, context = document) {
    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error);
      }
    }
    return null;
  }

  static async extractCompanyPosts(maxPosts = 5) {
    try {
      await this.waitForContent();
      
      const posts = [];
      const postContainers = this.findElements(this.POST_SELECTORS.containers);
      
      console.log(`📊 Found ${postContainers.length} potential post containers`);
      
      // Debug: Log some container details
      postContainers.slice(0, 3).forEach((container, index) => {
        console.log(`🔍 Container ${index + 1}:`, {
          tagName: container.tagName,
          className: container.className,
          hasVideos: !!container.querySelector('video'),
          hasIframes: !!container.querySelector('iframe'),
          textContent: container.textContent?.substring(0, 100) + '...'
        });
      });
      
      for (let i = 0; i < Math.min(postContainers.length, maxPosts * 2); i++) { // Check more posts to account for filtering
        const container = postContainers[i];
        const postData = await this.extractPostData(container);
        
        if (postData) {
          posts.push(postData);
          console.log(`✅ Post ${i + 1} extracted:`, {
            type: postData.type,
            hasText: !!postData.text,
            videoCount: postData.media.videos.length,
            imageCount: postData.media.images.length,
            textPreview: postData.text?.substring(0, 50) + '...'
          });
          
          // Stop when we have enough posts
          if (posts.length >= maxPosts) {
            break;
          }
        } else {
          console.log(`❌ Post ${i + 1} skipped: no content found or filtered out`);
        }
      }
      
      console.log(`📋 Final extraction result: ${posts.length} posts processed`);
      return posts;
    } catch (error) {
      console.error('Error extracting company posts:', error);
      return [];
    }
  }

  static async extractPostData(container) {
    try {
      const post = {
        id: this.generatePostId(container),
        text: this.extractPostText(container),
        date: this.extractPostDate(container),
        author: this.extractAuthor(container),
        media: await this.extractMedia(container),
        link: '',
        type: 'text'
      };

      // Check for video indicators in post content
      const hasVideoIndicators = this.detectVideoPost(container, post.text);
      
      // Determine post type based on media
      if (post.media.videos.length > 0) {
        post.type = 'video';
      } else if (post.media.images.length > 0) {
        post.type = 'image';
      } else if (hasVideoIndicators) {
        post.type = 'video';
        console.log('🎬 Detected video post based on content indicators');
      }
      

      console.log('📝 Post extracted:', {
        id: post.id.substring(0, 20) + '...',
        type: post.type,
        hasText: !!post.text,
        videos: post.media.videos.length,
        images: post.media.images.length,
        videoIndicators: hasVideoIndicators
      });

      // Filter out posts that are PRIMARILY video content, but keep posts with text/images
      const isPrimaryVideoPost = (post.type === 'video' && !post.text && post.media.images.length === 0) ||
                                 (post.media.videos.length > 0 && !post.text && post.media.images.length === 0);
      
      if (isPrimaryVideoPost) {
        console.log('🚫 Skipping primary video post to avoid overlay issues');
        return null;
      }

      // Strip video content but keep the post if it has text or images
      if (post.media.videos.length > 0) {
        console.log('🔧 Removing video content from mixed-media post, keeping text/images');
        post.media.videos = []; // Remove video content but keep the post
        post.type = post.media.images.length > 0 ? 'image' : 'text'; // Update type
      }

      // Only return posts with text or image content
      if (post.text || post.media.images.length > 0) {
        return post;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting post data:', error);
      return null;
    }
  }

  static extractPostText(container) {
    const textElement = this.findElement(this.POST_SELECTORS.text, container);
    if (textElement) {
      return TextFormatter.cleanText(textElement.textContent);
    }
    return '';
  }

  static extractPostDate(container) {
    const dateElement = this.findElement(this.POST_SELECTORS.dates, container);
    if (dateElement) {
      const datetime = dateElement.getAttribute('datetime');
      if (datetime) {
        return new Date(datetime).toISOString();
      }
      
      const timeText = dateElement.textContent.trim();
      return this.parseRelativeTime(timeText);
    }
    return new Date().toISOString();
  }

  static extractAuthor(container) {
    const authorElement = this.findElement(this.POST_SELECTORS.authors, container);
    if (authorElement) {
      return TextFormatter.cleanText(authorElement.textContent);
    }
    return '';
  }

  static async extractMedia(container) {
    const media = {
      images: [],
      videos: []
    };

    // Extract images
    const imageElements = this.findElements(this.POST_SELECTORS.images, container);
    for (const img of imageElements) {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (src && !src.includes('data:image')) {
        media.images.push({
          url: src,
          alt: img.alt || ''
        });
      }
    }

    // Extract videos and video thumbnails
    const videoElements = this.findElements(this.POST_SELECTORS.videos, container);
    console.log(`🎥 Found ${videoElements.length} potential video elements in post`);
    
    // Also look for iframes (YouTube, Vimeo, etc.)
    const iframes = container.querySelectorAll('iframe');
    console.log(`🖼️ Found ${iframes.length} iframes in post`);
    
    // Check iframes first for embedded videos
    for (const iframe of iframes) {
      const src = iframe.src || iframe.getAttribute('data-src');
      console.log('🔍 Checking iframe:', src);
      
      if (src) {
        // YouTube videos
        if (src.includes('youtube.com/embed/') || src.includes('youtu.be/')) {
          const videoId = this.extractYouTubeId(src);
          if (videoId) {
            media.videos.push({
              url: src,
              poster: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              type: 'youtube'
            });
            console.log('✅ Added YouTube video:', videoId);
          }
        }
        // Vimeo videos
        else if (src.includes('vimeo.com/video/')) {
          const videoId = src.match(/vimeo\.com\/video\/(\d+)/)?.[1];
          if (videoId) {
            media.videos.push({
              url: src,
              poster: '', // Vimeo thumbnails require API call
              type: 'vimeo'
            });
            console.log('✅ Added Vimeo video:', videoId);
          }
        }
      }
    }
    
    // Then check video elements
    for (const video of videoElements) {
      console.log('🔍 Checking video element:', video.tagName, video.className);
      
      if (video.tagName === 'VIDEO') {
        const src = video.src || video.currentSrc;
        const poster = video.poster;
        console.log('📹 Direct video element:', { src, poster });
        
        if (src && !src.includes('data:') && src.startsWith('http')) {
          media.videos.push({
            url: src,
            poster: poster || ''
          });
          console.log('✅ Added video:', src);
        } else if (poster) {
          // Even if video URL is invalid, use the poster as an image
          media.images.push({
            url: poster,
            alt: 'Video poster'
          });
          console.log('📸 Added video poster as image:', poster);
        }
      } else {
        // Handle video containers
        const nestedVideo = video.querySelector('video');
        if (nestedVideo) {
          const src = nestedVideo.src || nestedVideo.currentSrc;
          const poster = nestedVideo.poster;
          console.log('📹 Nested video element:', { src, poster });
          
          if (src && !src.includes('data:') && src.startsWith('http')) {
            media.videos.push({
              url: src,
              poster: poster || ''
            });
            console.log('✅ Added nested video:', src);
          } else if (poster) {
            media.images.push({
              url: poster,
              alt: 'Video poster'
            });
            console.log('📸 Added nested video poster as image:', poster);
          }
        } else {
          // Look for high-quality video thumbnails in the container
          const thumbnailImages = video.querySelectorAll('img');
          for (const img of thumbnailImages) {
            if (img.src && img.src.startsWith('http')) {
              // Check if this looks like a video thumbnail
              const isVideoThumbnail = img.className.includes('video') || 
                                     img.closest('[class*="video"]') ||
                                     img.alt?.toLowerCase().includes('video') ||
                                     img.src.includes('video') ||
                                     img.width >= 400 || img.height >= 300; // Large images likely thumbnails
              
              if (isVideoThumbnail && !media.images.find(existing => existing.url === img.src)) {
                media.images.push({
                  url: img.src,
                  alt: 'Video thumbnail'
                });
                console.log('📸 Added video thumbnail as image:', img.src);
              }
            }
          }
          
          // Check for external video URLs in data attributes
          const videoUrl = video.getAttribute('data-video-url') || 
                          video.getAttribute('data-src') ||
                          video.getAttribute('data-video-src') ||
                          video.getAttribute('data-video') ||
                          video.getAttribute('href');
          
          if (videoUrl && videoUrl.startsWith('http')) {
            media.videos.push({
              url: videoUrl,
              poster: video.getAttribute('data-poster') || video.getAttribute('data-thumbnail') || ''
            });
            console.log('✅ Added data attribute video:', videoUrl);
          }
        }
      }
    }

    // Enhanced video detection - look for video containers and thumbnails
    console.log('🔍 Checking for video content in container...');
    
    // Check if this container has video-related elements
    const hasVideoPlayer = container.querySelector('video') || 
                          container.querySelector('.video-player') ||
                          container.querySelector('[data-test-id*="video"]') ||
                          container.querySelector('.feed-shared-external-video') ||
                          container.querySelector('.dss-native-video-player');
    
    const hasPlayButton = container.querySelector('[aria-label*="play"]') ||
                         container.querySelector('.play-button') ||
                         container.querySelector('[class*="play"]');
    
    const hasVideoKeywords = container.textContent?.toLowerCase().includes('video') ||
                            container.textContent?.toLowerCase().includes('watch');
    
    if (hasVideoPlayer || hasPlayButton || hasVideoKeywords) {
      console.log('🎬 Video indicators found in container');
      
      // If we found video indicators but no actual video URL, create a placeholder video entry
      if (media.videos.length === 0) {
        media.videos.push({
          url: 'placeholder_video',
          poster: media.images.length > 0 ? media.images[0].url : '',
          type: 'placeholder',
          source: 'detected'
        });
        console.log('📹 Added placeholder video entry');
      }
    }

    return media;
  }

  static detectVideoPost(container, postText) {
    // Look for video indicators in the post
    const videoIndicators = [
      // Visual indicators
      'play-button',
      'video-player',
      'video-thumbnail',
      'video-overlay',
      // Data attributes
      '[data-test-id*="video"]',
      '[data-video-id]',
      '[data-player-id]',
      // LinkedIn specific video classes
      '.feed-shared-external-video',
      '.feed-shared-native-video',
      '.dss-native-video-player',
      '.artdeco-video-player',
      // Video service indicators
      '.youtube-player',
      '.vimeo-player'
    ];
    
    // Check for video-related elements
    for (const indicator of videoIndicators) {
      if (container.querySelector(indicator)) {
        console.log('🎬 Found video indicator:', indicator);
        return true;
      }
    }
    
    // Check for video-related text content
    if (postText) {
      const videoKeywords = ['watch', 'video', '📹', '🎥', '▶️', 'play', 'watch now', 'view video'];
      const lowerText = postText.toLowerCase();
      for (const keyword of videoKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          console.log('🎬 Found video keyword in text:', keyword);
          return true;
        }
      }
    }
    
    // Check for iframe embeds (YouTube, Vimeo, etc.)
    const iframes = container.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const src = iframe.src || iframe.getAttribute('data-src');
      if (src && (src.includes('youtube') || src.includes('vimeo') || src.includes('video'))) {
        console.log('🎬 Found video iframe:', src);
        return true;
      }
    }
    
    return false;
  }

  static generatePostId(container) {
    const dataId = container.getAttribute('data-id');
    if (dataId) {
      return dataId;
    }
    
    const textContent = container.textContent.substring(0, 100);
    return `post_${this.hashString(textContent)}`;
  }

  static parseRelativeTime(timeText) {
    const now = new Date();
    const lowerText = timeText.toLowerCase();
    
    if (lowerText.includes('now') || lowerText.includes('just')) {
      return now.toISOString();
    }
    
    const minuteMatch = lowerText.match(/(\d+)\s*m/);
    if (minuteMatch) {
      now.setMinutes(now.getMinutes() - parseInt(minuteMatch[1]));
      return now.toISOString();
    }
    
    const hourMatch = lowerText.match(/(\d+)\s*h/);
    if (hourMatch) {
      now.setHours(now.getHours() - parseInt(hourMatch[1]));
      return now.toISOString();
    }
    
    const dayMatch = lowerText.match(/(\d+)\s*d/);
    if (dayMatch) {
      now.setDate(now.getDate() - parseInt(dayMatch[1]));
      return now.toISOString();
    }
    
    return now.toISOString();
  }

  static extractYouTubeId(url) {
    const patterns = [
      /youtube\.com\/embed\/([^?&]+)/,
      /youtu\.be\/([^?&]+)/,
      /youtube\.com\/watch\?v=([^&]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  static hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  static async waitForContent(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkContent = () => {
        const containers = this.findElements(this.POST_SELECTORS.containers);
        
        if (containers.length > 0) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(); // Don't reject, just continue
          return;
        }
        
        setTimeout(checkContent, 500);
      };
      
      checkContent();
    });
  }

  static getCompanyName() {
    const selectors = [
      'h1[data-test-id="company-name"]',
      '.org-top-card-summary__title',
      '.org-top-card__name',
      'h1.t-24'
    ];
    
    const nameElement = this.findElement(selectors);
    return nameElement ? TextFormatter.cleanText(nameElement.textContent) : '';
  }

  static getCompanyLogo() {
    const selectors = [
      '.org-top-card-primary-content__logo-container img',
      '.org-top-card-summary__logo img',
      '.org-top-card__logo img',
      '.org-company-logo img'
    ];
    
    console.log('🔍 Searching for company logo with selectors:', selectors);
    
    for (const selector of selectors) {
      try {
        const logoElement = document.querySelector(selector);
        if (logoElement && logoElement.src) {
          console.log('✅ Found company logo with selector:', selector, 'URL:', logoElement.src);
          return logoElement.src;
        } else if (logoElement) {
          console.log('⚠️ Found logo element but no src:', selector, logoElement);
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error);
      }
    }
    
    console.log('❌ No company logo found with any selector');
    return '';
  }

  static getCompanyCoverImage() {
    // Look for the company cover image
    const coverSelectors = [
      '.org-cropped-image__cover-image.background-image',
      '.company-hero-image .background-image',
      '#organization-cover-single-photo-target-image .background-image',
      '.org-cropped-image .org-cropped-image__cover-image'
    ];
    
    const coverElement = this.findElement(coverSelectors);
    if (coverElement) {
      // Extract URL from background-image style
      const style = coverElement.style.backgroundImage;
      if (style) {
        const urlMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          console.log('📸 Found company cover image:', urlMatch[1]);
          return urlMatch[1];
        }
      }
    }
    
    console.log('📸 No company cover image found');
    return '';
  }
}

// ===== MAIN CONTENT SCRIPT =====
class LinkedInContentScript {
  constructor() {
    this.isCompanyPage = false;
    this.companyId = null;
    this.companyName = '';
    this.companyLogo = '';
    this.isExtracting = false;
    this.lastUrl = '';
    
    console.log('✅ Utilities loaded inline');
    this.init();
  }

  init() {
    console.log('🔧 Initializing content script...');
    
    this.checkPageType();
    this.setupMessageListener();
    this.setupUrlChangeDetection();
    this.setupDynamicContentObserver();
    
    console.log('✅ Content script initialization complete');
  }

  checkPageType() {
    const currentUrl = window.location.href;
    this.isCompanyPage = currentUrl.includes('/company/');
    
    if (this.isCompanyPage) {
      this.companyId = this.extractCompanyId(currentUrl);
      console.log(`🏢 On company page: ${this.companyId}`);
      this.extractCompanyInfo();
    } else {
      console.log('ℹ️ Not on a company page');
      this.companyId = null;
    }
  }

  extractCompanyId(url) {
    const match = url.match(/\/company\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  extractCompanyInfo() {
    try {
      this.companyName = LinkedInParser.getCompanyName();
      this.companyLogo = LinkedInParser.getCompanyLogo();
      this.companyCoverImage = LinkedInParser.getCompanyCoverImage();
      console.log(`✅ Company info extracted: ${this.companyName}`, {
        logo: this.companyLogo || 'none',
        coverImage: this.companyCoverImage || 'none'
      });
    } catch (error) {
      console.error('❌ Error extracting company info:', error);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);
      
      switch (message.action) {
        case 'extractPosts':
          this.handleExtractPosts(sendResponse, message.postCount);
          return true; // Keep the message channel open for async response
          
        case 'checkCompanyPage':
          sendResponse({
            isCompanyPage: this.isCompanyPage,
            companyId: this.companyId,
            companyName: this.companyName,
            companyLogo: this.companyLogo,
            companyCoverImage: this.companyCoverImage
          });
          break;
          
        case 'ping':
          sendResponse({ status: 'ready' });
          break;
          
        default:
          console.warn('⚠️ Unknown message action:', message.action);
      }
    });
  }

  async handleExtractPosts(sendResponse, postCount = 5) {
    if (!this.isCompanyPage) {
      sendResponse({ 
        success: false, 
        error: 'Not on a company page',
        posts: []
      });
      return;
    }

    if (this.isExtracting) {
      sendResponse({ 
        success: false, 
        error: 'Already extracting posts',
        posts: []
      });
      return;
    }

    try {
      this.isExtracting = true;
      console.log('🚀 Starting post extraction...');

      // Check if we have cached data first
      const cachedPosts = await StorageManager.getCompanyData(this.companyId);
      if (cachedPosts && cachedPosts.length > 0) {
        console.log(`💾 Found ${cachedPosts.length} cached posts`);
        sendResponse({
          success: true,
          posts: cachedPosts,
          companyName: this.companyName,
          companyLogo: this.companyLogo,
          companyCoverImage: this.companyCoverImage,
          fromCache: true
        });
        this.isExtracting = false;
        return;
      }

      // Wait for page content to load
      console.log('⏳ Waiting for page content...');
      await this.waitForPageContent();
      
      // Scroll to load more posts if needed
      console.log('📜 Scrolling to load posts...');
      await this.scrollToLoadPosts();
      
      // Extract posts using parser
      console.log(`🎯 Extracting ${postCount} posts...`);
      const posts = await LinkedInParser.extractCompanyPosts(postCount);
      console.log(`📊 Extracted ${posts.length} posts`);

      if (posts.length === 0) {
        sendResponse({
          success: false,
          error: 'No posts found',
          posts: []
        });
        return;
      }

      // Cache the extracted posts
      console.log('💾 Caching posts...');
      await StorageManager.storeCompanyData(this.companyId, posts);

      sendResponse({
        success: true,
        posts: posts,
        companyName: this.companyName,
        companyLogo: this.companyLogo,
        companyCoverImage: this.companyCoverImage,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Error extracting posts:', error);
      sendResponse({
        success: false,
        error: error.message,
        posts: []
      });
    } finally {
      this.isExtracting = false;
    }
  }

  async waitForPageContent(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkContent = () => {
        const feedElements = document.querySelectorAll('[data-id*="urn:li:activity"], .feed-shared-update-v2, .occludable-update');
        
        if (feedElements.length > 0) {
          console.log(`✅ Found ${feedElements.length} feed elements`);
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.log('⏰ Timeout waiting for content, proceeding anyway');
          resolve(); // Don't reject, just continue with whatever we have
          return;
        }
        
        setTimeout(checkContent, 500);
      };
      
      checkContent();
    });
  }

  async scrollToLoadPosts() {
    return new Promise((resolve) => {
      let scrollCount = 0;
      const maxScrolls = 3;
      
      const scrollInterval = setInterval(() => {
        window.scrollBy(0, 1000);
        scrollCount++;
        console.log(`📜 Scroll ${scrollCount}/${maxScrolls}`);
        
        if (scrollCount >= maxScrolls) {
          clearInterval(scrollInterval);
          console.log('📜 Scrolling complete, waiting for content...');
          setTimeout(resolve, 2000);
        }
      }, 1000);
    });
  }

  setupUrlChangeDetection() {
    let currentUrl = window.location.href;
    
    const urlCheckInterval = setInterval(() => {
      if (currentUrl !== window.location.href) {
        const oldUrl = currentUrl;
        currentUrl = window.location.href;
        console.log(`🔄 URL changed from ${oldUrl} to ${currentUrl}`);
        this.checkPageType();
      }
    }, 1000);
    
    window.addEventListener('popstate', () => {
      setTimeout(() => this.checkPageType(), 500);
    });
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(() => self.checkPageType(), 500);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => self.checkPageType(), 500);
    };
  }

  setupDynamicContentObserver() {
    const observer = new MutationObserver((mutations) => {
      let contentChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector && node.querySelector('[data-id*="urn:li:activity"], .feed-shared-update-v2')) {
                contentChanged = true;
                break;
              }
            }
          }
        }
      });
      
      if (contentChanged) {
        console.log('🆕 New content detected, clearing cache');
        if (this.companyId) {
          StorageManager.clearCompanyData(this.companyId);
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the content script
const contentScript = new LinkedInContentScript();
console.log('✅ LinkedIn Company Carousel Content Script Ready');