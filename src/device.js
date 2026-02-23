/* ─── Device Detection ─── */

/**
 * Detect whether the current device is mobile or desktop.
 * Uses a combination of user-agent sniffing and touch capability detection
 * for reliable results across Android 12–15 Chrome and desktop browsers.
 */
function detectMobile() {
    // Check user agent for mobile indicators
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );

    // Check for touch capability (tablets and phones)
    const hasTouch = navigator.maxTouchPoints > 0;

    // Check for small screen (fallback — landscape phones are still < 1024 usually)
    const smallScreen = window.innerWidth <= 1024 && window.innerHeight <= 900;

    // Mobile if user agent says so, OR if it has touch AND a small screen
    return mobileUA || (hasTouch && smallScreen);
}

export const isMobile = detectMobile();
export const deviceType = isMobile ? 'mobile' : 'desktop';

// Add CSS class to <html> for CSS-driven layout switching
document.documentElement.classList.add(deviceType);

console.log(`Device detected: ${deviceType}`);
