// LinkedIn Carousel Overlay - No Video Posts
console.log('📷 Loading No-Video LinkedIn Carousel Overlay...');

// Prevent multiple injections
if (window.linkedinCarouselNoVideoLoaded) {
  console.log('⚠️ No-video overlay already loaded');
} else {
  window.linkedinCarouselNoVideoLoaded = true;

  // Storage Manager
  window.NoVideoCarouselStorage = {
    async getSessionData(sessionKey) {
      try {
        if (!chrome?.runtime?.id) return null;
        const result = await chrome.storage.local.get([sessionKey]);
        return result[sessionKey] || null;
      } catch (error) {
        console.error('Storage error:', error);
        return null;
      }
    }
  };

  // Text Formatter
  window.NoVideoCarouselFormatter = {
    formatDate(dateString) {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch (error) {
        return 'Recently';
      }
    },

    // SECURITY: Sanitize text content to prevent XSS
    cleanText(text) {
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
      
      return this.sanitizeHTML(cleanedText);
    },

    // SECURITY: HTML sanitization to prevent XSS attacks
    sanitizeHTML(str) {
      if (!str) return '';
      
      // Create a temporary div to safely escape HTML
      const temp = document.createElement('div');
      temp.textContent = str;
      return temp.innerHTML;
    },

    // SECURITY: URL validation to prevent malicious URLs
    isValidURL(url) {
      if (!url) return false;
      
      try {
        const urlObj = new URL(url);
        // Only allow https URLs from LinkedIn domains
        return urlObj.protocol === 'https:' && 
               (urlObj.hostname.endsWith('linkedin.com') || 
                urlObj.hostname.endsWith('licdn.com'));
      } catch {
        return false;
      }
    }
  };

  // No-Video Carousel Controller
  window.NoVideoCarouselController = class {
    constructor(settings = {}) {
      this.slides = [];
      this.currentSlide = 0;
      this.isPlaying = settings.autoPlay !== false;
      this.rotationTimer = null;
      this.progressTimer = null;
      this.ROTATION_INTERVAL = (settings.slideDuration || 45) * 1000;
      
      console.log(`📷 No-video carousel initialized with ${this.ROTATION_INTERVAL/1000}s intervals`);
    }

    loadSlides(posts) {
      console.log('📷 Loading slides (no video):', posts.length);
      this.slides = posts;
      this.renderSlides();
      this.renderIndicators();
      
      if (this.slides.length > 0) {
        this.showSlide(0);
        this.startAutoRotation();
      }
    }

    renderSlides() {
      const container = document.getElementById('slides-container');
      if (!container) return;

      container.innerHTML = '';

      this.slides.forEach((post, index) => {
        const slide = this.createSlideElement(post, index);
        container.appendChild(slide);
      });
    }

    createSlideElement(post, index) {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.index = index;
      
      slide.innerHTML = `
        <div class="slide-content">
          <div class="media-section">
            <div class="media-container">
              ${this.createMediaHTML(post, index)}
            </div>
          </div>
          <div class="content-section">
            ${this.sessionData?.companyCoverImage && window.NoVideoCarouselFormatter.isValidURL(this.sessionData.companyCoverImage) ? `
              <div class="content-cover-banner" style="
                width: 100%;
                height: 80px;
                background-image: url('${this.sessionData.companyCoverImage}');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                position: relative;
                overflow: hidden;
                margin: 0 0 1rem 0;
                z-index: 1;
                border-top-left-radius: 0;
                border-top-right-radius: 12px;
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
              ">
              </div>
            ` : ''}
            <div class="content-container">
              <div class="post-meta">
                <div class="post-date">${window.NoVideoCarouselFormatter.formatDate(post.date)}</div>
              </div>
              <div class="post-content">
                <div class="post-text">${window.NoVideoCarouselFormatter.cleanText(post.text) || 'No text content'}</div>
              </div>
              <div class="post-footer">
                <span class="type-indicator">${post.type || 'text'}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      return slide;
    }

    createMediaHTML(post, index) {
      console.log(`📷 Creating media for slide ${index} (no video allowed)`);

      // Only handle images - no video content at all
      if (post.media.images.length > 0) {
        if (post.media.images.length === 1) {
          // Single image - show directly
          const image = post.media.images[0];
          const imageId = `carousel-image-${index}-${Date.now()}`;
          setTimeout(() => {
            const imgElement = document.getElementById(imageId);
            if (imgElement) {
              imgElement.addEventListener('load', () => {
                console.log(`✅ Image loaded for slide ${index}`);
              });
              imgElement.addEventListener('error', () => {
                console.log(`❌ Image failed for slide ${index}`);
                imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMmQyZDJkIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZTwvdGV4dD4KPC9zdmc+';
              });
            }
          }, 100);
          
          return `
            <img 
              id="${imageId}"
              class="carousel-image" 
              src="${image.url}" 
              alt="${image.alt || ''}" 
              style="width: 100%; height: 100%; object-fit: cover; animation: kenBurns 50s ease-in-out infinite alternate;"
            >
          `;
        } else {
          // Multiple images - create rotating container
          const containerId = `image-rotator-${index}-${Date.now()}`;
          console.log(`🔄 Creating image rotator for slide ${index} with ${post.media.images.length} images`);
          
          setTimeout(() => {
            this.setupImageRotation(containerId, post.media.images, index);
          }, 100);
          
          const imagesHtml = post.media.images.map((image, imgIndex) => {
            const imageId = `rotator-image-${index}-${imgIndex}-${Date.now()}`;
            return `
              <img 
                id="${imageId}"
                class="carousel-image rotator-image" 
                src="${image.url}" 
                alt="${image.alt || ''}" 
                style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover; 
                  animation: kenBurns 50s ease-in-out infinite alternate;
                  opacity: ${imgIndex === 0 ? 1 : 0};
                  transition: opacity 0.8s ease-in-out;
                  z-index: ${imgIndex === 0 ? 10 : 1};
                "
                data-image-index="${imgIndex}"
              >
            `;
          }).join('');
          
          return `
            <div id="${containerId}" class="image-rotator-container" style="
              position: relative;
              width: 100%;
              height: 100%;
              overflow: hidden;
            " data-current-image="0" data-total-images="${post.media.images.length}">
              ${imagesHtml}
              <div class="image-counter" style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 0.9rem;
                z-index: 20;
                backdrop-filter: blur(10px);
              ">1 / ${post.media.images.length}</div>
            </div>
          `;
        }
      }
      
      // Default background for text-only posts - use company logo if available
      const companyLogo = this.sessionData?.companyLogo;
      console.log(`🏢 Company logo for slide ${index}:`, companyLogo);
      
      if (companyLogo) {
        const logoId = `company-logo-${index}-${Date.now()}`;
        setTimeout(() => {
          const logoImg = document.getElementById(logoId);
          if (logoImg) {
            logoImg.addEventListener('load', () => {
              console.log(`✅ Company logo loaded for slide ${index}`);
            });
            logoImg.addEventListener('error', () => {
              console.log(`❌ Company logo failed for slide ${index}`);
              logoImg.style.display = 'none';
              logoImg.parentElement.innerHTML = '<div style="font-size: 4rem; opacity: 0.5; color: #666;">📄</div>';
            });
          }
        }, 100);
        
        return `
          <div class="text-post-background" style="
            width: 100%;
            height: 100%;
            background: #1D2226;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <img 
              id="${logoId}"
              src="${companyLogo}" 
              alt="Company logo" 
              style="
                width: 64px;
                height: 64px;
                object-fit: contain;
                opacity: 0.8;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
              "
            >
          </div>
        `;
      } else {
        // Fallback to document icon with modal background color
        return `
          <div class="text-post-background" style="
            width: 100%;
            height: 100%;
            background: #1D2226;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 4rem;
            opacity: 0.5;
          ">
            📄
          </div>
        `;
      }
    }

    renderIndicators() {
      const container = document.getElementById('indicators-container');
      if (!container) return;

      container.innerHTML = '';
      this.slides.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'indicator';
        indicator.dataset.index = index;
        indicator.addEventListener('click', () => this.goToSlide(index));
        container.appendChild(indicator);
      });
    }

    showSlide(index) {
      if (index < 0 || index >= this.slides.length) return;

      this.currentSlide = index;

      // Simple slide management
      const slides = document.querySelectorAll('.slide');
      slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (i === index) {
          slide.classList.add('active');
        }
      });

      // Update indicators
      const indicators = document.querySelectorAll('.indicator');
      indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
      });

      // Handle progress
      this.resetProgress();
      if (this.isPlaying) {
        this.startProgress();
      }
    }

    goToSlide(index) {
      if (index === this.currentSlide) return;
      this.showSlide(index);
      this.restartAutoRotation();
    }

    goToNextSlide() {
      const nextIndex = (this.currentSlide + 1) % this.slides.length;
      this.goToSlide(nextIndex);
    }

    goToPrevSlide() {
      const prevIndex = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
      this.goToSlide(prevIndex);
    }

    togglePlayPause() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    play() {
      this.isPlaying = true;
      this.startAutoRotation();
      this.startProgress();
    }

    pause() {
      this.isPlaying = false;
      this.stopAutoRotation();
      this.stopProgress();
    }

    startAutoRotation() {
      this.stopAutoRotation();
      if (this.slides.length <= 1) return;
      
      this.rotationTimer = setInterval(() => {
        if (this.isPlaying) {
          this.goToNextSlide();
        }
      }, this.ROTATION_INTERVAL);
    }

    stopAutoRotation() {
      if (this.rotationTimer) {
        clearInterval(this.rotationTimer);
        this.rotationTimer = null;
      }
    }

    restartAutoRotation() {
      if (this.isPlaying) {
        this.startAutoRotation();
        this.resetProgress();
        this.startProgress();
      }
    }

    startProgress() {
      this.stopProgress();
      const progressBar = document.getElementById('progress-bar');
      if (!progressBar || !this.isPlaying) return;
      
      let progress = 0;
      const increment = 100 / (this.ROTATION_INTERVAL / 100);
      
      this.progressTimer = setInterval(() => {
        progress += increment;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
          this.stopProgress();
        }
      }, 100);
    }

    stopProgress() {
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
    }

    resetProgress() {
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.style.width = '0%';
      }
    }

    setupImageRotation(containerId, images, slideIndex) {
      const container = document.getElementById(containerId);
      if (!container || images.length <= 1) return;
      
      console.log(`🔄 Setting up image rotation for slide ${slideIndex} with ${images.length} images`);
      
      let currentImageIndex = 0;
      const rotationInterval = 5000; // 5 seconds
      
      const rotateImages = () => {
        const allImages = container.querySelectorAll('.rotator-image');
        const counter = container.querySelector('.image-counter');
        
        if (allImages.length === 0) return;
        
        // Hide current image
        const currentImage = allImages[currentImageIndex];
        if (currentImage) {
          currentImage.style.opacity = '0';
          currentImage.style.zIndex = '1';
        }
        
        // Move to next image
        currentImageIndex = (currentImageIndex + 1) % images.length;
        
        // Show next image
        const nextImage = allImages[currentImageIndex];
        if (nextImage) {
          nextImage.style.opacity = '1';
          nextImage.style.zIndex = '10';
        }
        
        // Update counter
        if (counter) {
          counter.textContent = `${currentImageIndex + 1} / ${images.length}`;
        }
        
        console.log(`🔄 Rotated to image ${currentImageIndex + 1}/${images.length} in slide ${slideIndex}`);
      };
      
      // Store the rotation timer on the container for cleanup
      const timer = setInterval(rotateImages, rotationInterval);
      container.dataset.rotationTimer = timer;
      
      // Add error handling for each image
      const allImages = container.querySelectorAll('.rotator-image');
      allImages.forEach((img, imgIndex) => {
        img.addEventListener('error', () => {
          console.log(`❌ Image ${imgIndex + 1} failed in slide ${slideIndex}`);
          img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMmQyZDJkIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZTwvdGV4dD4KPC9zdmc>';
        });
        img.addEventListener('load', () => {
          console.log(`✅ Image ${imgIndex + 1} loaded in slide ${slideIndex}`);
        });
      });
    }

    destroy() {
      console.log('📷 Destroying no-video carousel');
      this.stopAutoRotation();
      this.stopProgress();
      
      // Clean up image rotation timers
      const rotatorContainers = document.querySelectorAll('.image-rotator-container');
      rotatorContainers.forEach(container => {
        const timer = container.dataset.rotationTimer;
        if (timer) {
          clearInterval(parseInt(timer));
        }
      });
    }
  };

  // No-video overlay initialization
  window.initNoVideoCarouselOverlay = async function(sessionKey) {
    console.log('📷 Initializing no-video carousel overlay');
    
    // Remove any existing overlay
    const existingOverlay = document.getElementById('linkedin-carousel-overlay');
    if (existingOverlay) {
      console.log('🧹 Cleaning up existing overlay');
      if (window.noVideoCarousel) {
        window.noVideoCarousel.destroy();
        window.noVideoCarousel = null;
      }
      existingOverlay.remove();
    }

    // Create overlay HTML - will add cover image after loading session data
    const overlay = document.createElement('div');
    overlay.id = 'linkedin-carousel-overlay';
    overlay.innerHTML = `
      <div class="carousel-overlay-backdrop">
        <div class="carousel-overlay-content">
          <div id="carousel-loading" class="carousel-loading">
            <div class="loading-spinner"></div>
            <p>Loading carousel...</p>
          </div>
          <div id="carousel-container" class="carousel-container hidden">
            <div class="slides-container" id="slides-container"></div>
            
            <div class="carousel-indicators">
              <div class="indicators-container" id="indicators-container"></div>
              <div class="progress-container">
                <div class="progress-bar" id="progress-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    try {
      // Load session data
      const sessionData = await window.NoVideoCarouselStorage.getSessionData(sessionKey);
      
      if (!sessionData) {
        throw new Error('Session data not found');
      }
      
      console.log('✅ No-video session data loaded:', {
        postsCount: sessionData.posts?.length,
        companyName: sessionData.companyName,
        companyLogo: sessionData.companyLogo,
        companyCoverImage: sessionData.companyCoverImage
      });
      
      // We'll add the cover image to each slide's content section instead of as a banner
      
      // Log what we received and do minimal filtering
      console.log('📷 Received posts for no-video carousel:', sessionData.posts.map(p => ({
        type: p.type,
        hasText: !!p.text,
        hasImages: p.media.images.length > 0,
        hasVideos: p.media.videos.length > 0
      })));
      
      // Only filter out posts that are purely video with no other content
      const filteredPosts = sessionData.posts.filter(post => {
        // Keep posts with text or images, even if they originally had video
        if (post.text || post.media.images.length > 0) {
          return true;
        }
        
        // Filter out pure video posts
        if (post.type === 'video' && !post.text && post.media.images.length === 0) {
          console.log('🚫 Filtering out pure video post in overlay');
          return false;
        }
        
        return true;
      });
      
      if (filteredPosts.length === 0) {
        throw new Error('No suitable posts found (videos excluded)');
      }
      
      console.log(`📷 Showing ${filteredPosts.length} non-video posts`);
      
      // Show carousel
      document.getElementById('carousel-loading')?.classList.add('hidden');
      document.getElementById('carousel-container')?.classList.remove('hidden');
      
      // Initialize no-video carousel with session data for cover image
      const carousel = new window.NoVideoCarouselController(sessionData.settings || {});
      carousel.sessionData = sessionData; // Pass session data to carousel
      
      // Apply text size setting to CSS
      if (sessionData.settings && sessionData.settings.textSize) {
        const textSize = sessionData.settings.textSize;
        console.log(`🔤 Applying text size: ${textSize}rem`);
        
        // Create or update style element for dynamic text sizing
        let styleElement = document.getElementById('carousel-dynamic-styles');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'carousel-dynamic-styles';
          document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = `
          .post-text {
            font-size: ${textSize}rem !important;
          }
        `;
      }
      
      carousel.loadSlides(filteredPosts);
      
      // Setup controls
      setupNoVideoOverlayControls(carousel);
      
      window.noVideoCarousel = carousel;
      
      console.log('📷 No-video carousel overlay initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize no-video carousel overlay:', error);
      showNoVideoOverlayError(error.message);
    }
  };

  function setupNoVideoOverlayControls(carousel) {
    // Keyboard controls - keeping arrow keys and escape for accessibility
    const keyboardHandler = (event) => {
      const handledKeys = ['Space', 'ArrowLeft', 'ArrowRight', 'Escape'];
      if (handledKeys.includes(event.code)) {
        event.preventDefault();
        event.stopPropagation();
      }

      switch (event.code) {
        case 'Space':
          carousel.togglePlayPause();
          break;
        case 'ArrowLeft':
          carousel.goToPrevSlide();
          break;
        case 'ArrowRight':
          carousel.goToNextSlide();
          break;
        case 'Escape':
          window.closeNoVideoCarouselOverlay();
          break;
      }
    };
    
    document.addEventListener('keydown', keyboardHandler);
    window.noVideoKeyboardHandler = keyboardHandler;
    
    // Click outside to close
    const backdrop = document.querySelector('.carousel-overlay-backdrop');
    backdrop?.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        window.closeNoVideoCarouselOverlay();
      }
    });
  }

  window.closeNoVideoCarouselOverlay = function() {
    console.log('📷 Closing no-video carousel overlay');
    
    // Cleanup
    if (window.noVideoCarousel) {
      window.noVideoCarousel.destroy();
      window.noVideoCarousel = null;
    }
    
    if (window.noVideoKeyboardHandler) {
      document.removeEventListener('keydown', window.noVideoKeyboardHandler);
      window.noVideoKeyboardHandler = null;
    }
    
    // Remove overlay
    const overlay = document.getElementById('linkedin-carousel-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => overlay.remove(), 300);
    }
    
    // Clean up session data
    if (window.carouselSessionKey && chrome?.runtime?.id) {
      try {
        chrome.storage.local.remove([window.carouselSessionKey]).catch(error => {
          console.warn('Failed to clean up session data:', error);
        });
        window.carouselSessionKey = null;
      } catch (error) {
        console.log('Storage cleanup failed:', error.message);
      }
    }
  };

  function showNoVideoOverlayError(message) {
    const loading = document.getElementById('carousel-loading');
    if (loading) {
      loading.innerHTML = `
        <div style="text-align: center; color: white;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h2 style="margin-bottom: 1rem;">Unable to Load Carousel</h2>
          <p style="color: #B0B7C3; margin-bottom: 2rem;">${message}</p>
          <p style="color: #888; font-size: 0.9rem;">Click outside this window to close</p>
        </div>
      `;
    }
  }

  console.log('📷 No-video overlay script loaded');
}