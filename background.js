// Background service worker

// Store current DOI
let currentDOI = null;

// Listen for DOI detection from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'doiDetected') {
        currentDOI = request.doi;
        // Update badge to show DOI detected
        chrome.action.setBadgeText({ text: '●', tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: sender.tab.id });
    }
});

// Clear badge when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        currentDOI = null;
        chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
});