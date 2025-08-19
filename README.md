# LinkedIn Company Carousel Chrome Extension

A Chrome extension that transforms LinkedIn company page updates into a beautiful, full-window carousel experience with auto-rotating slides and professional presentation. View company updates in an immersive overlay with customizable settings and enhanced readability.

## ✨ Key Features

### 🎪 **Immersive Carousel Experience**
- **Overlay Display**: Beautiful modal overlay that appears over the LinkedIn page
- **16:9 Split Layout**: Media on left (50%), content on right (50%) 
- **Auto-Rotation**: Configurable slide timing (15-90 seconds)
- **Smooth Transitions**: Professional animations with Ken Burns effect on images

### 🎛️ **Customizable Settings**
- **Post Count**: Choose 3, 5, 8, or 10 posts to display
- **Text Size**: 5 adjustable sizes (2rem - 3rem) for optimal readability
- **Slide Duration**: 15, 30, 45, 60, or 90 seconds per slide
- **Auto-play Control**: Toggle automatic rotation on/off

### 🖼️ **Enhanced Media Support**
- **Image Rotation**: Multiple images cycle every 5 seconds with fade transitions
- **Company Branding**: Company cover image banner and logo integration
- **Text-Only Posts**: Company logo displayed on elegant background
- **Smart Filtering**: Excludes video content to prevent playback issues

### 🛡️ **Privacy & Security**
- **Local Storage Only**: All data processed and cached locally in your browser
- **No External Servers**: Zero data transmission to external services
- **Secure Processing**: XSS protection and URL validation
- **Minimal Permissions**: Only requires access to LinkedIn company pages

## Installation

### Method 1: Developer Mode (For Testing)

1. **Download or Clone** this extension folder to your computer
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Method 2: Chrome Web Store (Not Yet Available)
*This extension is not yet published to the Chrome Web Store*

## 🚀 Usage

### **Step 1: Configure Settings**
1. **Visit a LinkedIn company page** (e.g., `https://www.linkedin.com/company/companyname/`)
2. **Click the extension icon** in your Chrome toolbar
3. **Adjust settings** in the popup:
   - **Post Count**: Select how many posts to display (3-10)
   - **Text Size**: Choose your preferred reading size
   - **Slide Duration**: Set timing for each slide
   - **Auto-play**: Toggle automatic progression

### **Step 2: Launch Carousel**
4. **Click "Launch Carousel"** button
5. **Wait for extraction** - the extension analyzes the page content
6. **Enjoy the overlay** - carousel appears over the LinkedIn page

### **⌨️ Keyboard Controls**
- **Space**: Pause/Resume auto-rotation
- **Left Arrow (←)**: Previous slide  
- **Right Arrow (→)**: Next slide
- **Escape**: Close carousel

### **🎯 Interactive Elements**
- **Slide Indicators**: Click dots to jump to specific slides
- **Progress Bar**: Visual timing indicator for current slide
- **Image Counter**: Shows current image position (for multi-image posts)
- **Click Outside**: Close carousel by clicking the backdrop

## Requirements

- **Chrome Browser**: Version 88 or higher
- **LinkedIn Access**: Must be logged into LinkedIn
- **Company Pages**: Only works on LinkedIn company pages (not personal profiles)

## 🔧 How It Works

### **1. Smart Content Detection**
- Automatically detects LinkedIn company pages
- Waits for page content to fully load
- Validates page structure before extraction

### **2. Advanced Data Extraction**
- **Robust DOM Parsing**: Multiple selector fallbacks for reliability
- **Content Processing**: Extracts text, images, dates, and metadata
- **Hashtag Cleanup**: Fixes LinkedIn's "hashtag#sample" formatting issues
- **Media Discovery**: Finds company logos and cover images

### **3. Secure Local Processing**
- **XSS Protection**: All content sanitized before display
- **URL Validation**: Only LinkedIn HTTPS URLs allowed
- **Local Caching**: 1-hour expiry for performance
- **No External Calls**: Everything processed locally

### **4. Professional Presentation**
- **Overlay Architecture**: Modal overlay with backdrop blur
- **Responsive Design**: Adapts to different screen sizes
- **Smooth Animations**: CSS transitions with hardware acceleration
- **Accessibility**: Keyboard navigation and focus management

## 🏗️ Technical Architecture

### **Core Components**
- **Manifest V3**: Latest Chrome extension standard for security
- **Content Script**: Consolidated DOM parsing and extraction
- **Background Service Worker**: Session management and storage
- **Popup Interface**: Settings configuration and controls
- **Overlay Display**: Carousel presentation layer

### **Current File Structure**
```
linkedin-carousel-extension/
├── manifest.json                 # Extension configuration (secured)
├── background.js                 # Service worker (cleaned)
├── content-script-consolidated.js # All-in-one content script
├── display/
│   ├── overlay-no-video.js      # Main carousel implementation
│   └── overlay.css              # Professional styling
├── popup/                        # Settings interface
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── assets/                       # Extension icons
└── SECURITY.md                   # Security audit report
```

### **Security Features**
- **Minimal Permissions**: Only `activeTab`, `storage`, `scripting`
- **Content Sanitization**: HTML entity escaping prevents XSS
- **URL Validation**: Restricted to LinkedIn domains only
- **CSP Compliance**: No inline scripts or unsafe evaluations

## 🔧 Troubleshooting

### **❌ Extension Not Working**
- **Check URL**: Ensure you're on a LinkedIn company page (`/company/...`)
- **Page Loading**: Wait for page to fully load before launching
- **Refresh Extension**: Go to `chrome://extensions/` and reload the extension
- **Browser Console**: Check for JavaScript errors in developer tools

### **📭 No Posts Found**
- **Company Activity**: Some companies may not have recent posts
- **Scroll First**: Scroll down to trigger LinkedIn's lazy loading
- **Cache Clear**: Use "Clear Cache" button in extension popup
- **Page Structure**: LinkedIn may have updated their DOM structure

### **🎨 Display Issues**
- **Browser Zoom**: Reset browser zoom to 100% for optimal layout
- **Window Size**: Ensure adequate browser window size (minimum 1024px width)
- **Hardware Acceleration**: Enable in Chrome settings for smooth animations
- **Ad Blockers**: Some ad blockers may interfere with content extraction

### **🏃‍♂️ Performance Issues**
- **Multiple Images**: Posts with many images may take longer to load
- **Network Speed**: Slow connections affect image loading times
- **Background Tabs**: Close unnecessary tabs to improve performance

## ⚠️ Current Limitations

### **Content Restrictions**
- **Video Exclusion**: Video posts are filtered out to prevent playback issues
- **Post Limits**: Displays 3-10 posts based on your settings
- **Recent Posts Only**: Shows most recent company updates
- **Public Content Only**: Cannot access private or restricted posts

### **Platform Dependencies**
- **LinkedIn Changes**: May require updates if LinkedIn modifies their structure
- **Chrome Only**: Designed specifically for Chrome browser
- **Login Required**: Must be logged into LinkedIn to access company content
- **Company Pages Only**: Does not work on personal profiles or other LinkedIn pages

## 🛠️ Development & Contributing

### **Building from Source**
```bash
# No build process required - pure HTML/CSS/JavaScript
git clone [repository-url]
cd linkedin-carousel-extension

# Load in Chrome Developer Mode
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select this folder
```

### **Development Guidelines**
- **Security First**: All changes must pass security review
- **LinkedIn Compatibility**: Test on multiple company pages
- **Performance**: Optimize for smooth animations and fast loading
- **Accessibility**: Maintain keyboard navigation and screen reader support

### **Contributing**
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Test** thoroughly on various LinkedIn company pages
4. **Security Check**: Run security validation before submitting
5. **Submit** a pull request with detailed description

## 📞 Support & Feedback

### **Getting Help**
1. **Check Troubleshooting**: Review the troubleshooting section above
2. **Test Environment**: Verify on a known working LinkedIn company page
3. **Extension Conflicts**: Temporarily disable other extensions
4. **Report Issues**: Include specific company page URLs (if safe to share)

### **Feature Requests**
The extension is designed to be lightweight and focused. Current priorities:
- Enhanced text formatting options
- Better responsive design for smaller screens  
- Additional company branding elements
- Improved accessibility features

## 🔐 Privacy & Security

### **Data Handling**
- **Local Only**: All data processing occurs within your browser
- **No Tracking**: No analytics, telemetry, or user tracking
- **No External Servers**: Zero data transmission to third parties
- **Secure Storage**: Chrome's encrypted local storage only
- **LinkedIn Respect**: Only accesses publicly visible company content

### **Permissions Justification**
- **`activeTab`**: Required to read content from current LinkedIn tab
- **`storage`**: Needed for caching posts and saving user preferences
- **`scripting`**: Essential for injecting the carousel overlay

### **Security Audit**
✅ **XSS Protection**: All content sanitized before display  
✅ **URL Validation**: Only LinkedIn HTTPS domains allowed  
✅ **Minimal Permissions**: Reduced to essential permissions only  
✅ **CSP Compliance**: No unsafe inline scripts or evaluations  

*See `SECURITY.md` for complete security audit report*

## 📄 License & Legal

**License**: MIT License - Free for personal and educational use  
**LinkedIn Compliance**: Respects LinkedIn's Terms of Service  
**No Warranty**: Provided as-is without guarantees  
**User Responsibility**: Users must comply with LinkedIn's policies  

---

## 📊 Extension Info

**Current Version**: `1.0.0`  
**Chrome Compatibility**: Version 88+  
**Manifest Version**: 3 (Latest Standard)  
**Last Security Audit**: 18 August 2025  
**Status**: ✅ **Production Ready**  
