const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const GEMINI_MODELS = [
    "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-exp",
    "gemini-2.0-flash-001", "gemini-2.0-flash-lite-preview-02-05",
    "gemini-flash-lite-latest", "gemini-2.5-flash-lite"
];

async function getApiKey() {
    const result = await chrome.storage.local.get(['apiKey']);
    return result.apiKey || null;
}

// Helper function to get criteria from storage
async function getCriteria() {
    const result = await chrome.storage.local.get(['criteria']);
    return result.criteria || '';
}


// Export configuration (for potential future use)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getApiKey, getCriteria, GEMINI_API_URL, GEMINI_MODELS };
}
