// Content script that runs on all pages to detect DOI links

// Function to detect DOI in URL or page content
function detectDOI() {
    const url = window.location.href;

    // Common DOI patterns in URLs
    const doiPatterns = [
        /doi\.org\/(10\.\d{4,}\/[^\s]+)/i,
        /dx\.doi\.org\/(10\.\d{4,}\/[^\s]+)/i,
        /doi[:\s]+(10\.\d{4,}\/[^\s]+)/i,
        /(10\.\d{4,}\/[^\s]+)/i
    ];

    for (let pattern of doiPatterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1] || match[0];
        }
    }

    // Check meta tags for DOI
    const doiMeta = document.querySelector('meta[name="citation_doi"], meta[name="DOI"], meta[property="citation_doi"]');
    if (doiMeta) {
        return doiMeta.content.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '');
    }

    // Check page content for DOI
    const bodyText = document.body.innerText;
    const doiMatch = bodyText.match(/DOI[:\s]+(10\.\d{4,}\/[^\s]+)/i);
    if (doiMatch) {
        return doiMatch[1];
    }

    return null;
}

// Function to extract paper content
function extractPaperContent() {
    let content = {
        title: '',
        abstract: '',
        fullText: '',
        authors: '',
        year: ''
    };

    // Try to get title
    const titleSelectors = [
        'meta[name="citation_title"]',
        'meta[property="og:title"]',
        'h1.article-title',
        'h1.title',
        '.article-title',
        'h1'
    ];

    for (let selector of titleSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
            content.title = elem.content || elem.textContent;
            if (content.title) break;
        }
    }

    // Try to get abstract
    const abstractSelectors = [
        'meta[name="citation_abstract"]',
        '.abstract',
        '#abstract',
        '[class*="abstract"]'
    ];

    for (let selector of abstractSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
            content.abstract = elem.content || elem.textContent;
            if (content.abstract) break;
        }
    }

    // Try to get authors
    const authorMetas = document.querySelectorAll('meta[name="citation_author"]');
    if (authorMetas.length > 0) {
        content.authors = Array.from(authorMetas).map(m => m.content).join(', ');
    }

    // Try to get year
    const yearMeta = document.querySelector('meta[name="citation_publication_date"], meta[name="citation_year"]');
    if (yearMeta) {
        content.year = yearMeta.content.match(/\d{4}/)?.[0] || '';
    }

    // Get full text - try to get article body
    const articleSelectors = [
        'article',
        '.article-body',
        '.article-content',
        '#article-content',
        'main',
        '.paper-content'
    ];

    for (let selector of articleSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
            content.fullText = elem.textContent;
            if (content.fullText && content.fullText.length > 500) break;
        }
    }

    // If no full text found, get all paragraphs
    if (!content.fullText || content.fullText.length < 500) {
        const paragraphs = document.querySelectorAll('p');
        content.fullText = Array.from(paragraphs).map(p => p.textContent).join('\n\n');
    }

    return content;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectDOI') {
        const doi = detectDOI();
        sendResponse({ doi: doi });
    } else if (request.action === 'extractContent') {
        const content = extractPaperContent();
        sendResponse({ content: content });
    }
    return true;
});

// Send DOI detection to background on page load
const doi = detectDOI();
if (doi) {
    chrome.runtime.sendMessage({ action: 'doiDetected', doi: doi });
}