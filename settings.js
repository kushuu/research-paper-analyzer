// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
    const result = await chrome.storage.local.get(['apiKey', 'criteria']);

    if (result.apiKey) {
        document.getElementById('apiKey').value = result.apiKey;
    }

    if (result.criteria) {
        document.getElementById('criteria').value = result.criteria;
    } else {
        // Set default criteria
        document.getElementById('criteria').value = `This is a sample criteria, you can replace this your own actual criteria or you can go ahead and upload a PDF file containing the criteria.`;
    }

    // Add PDF upload handler
    document.getElementById('pdfUpload').addEventListener('change', handlePDFUpload);
});

// Handle PDF file upload
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('pdfStatus');
    statusEl.textContent = '⏳ Reading PDF...';
    statusEl.style.color = '#667eea';

    try {
        const text = await extractTextFromPDF(file);

        if (text.trim()) {
            document.getElementById('criteria').value = text;
            statusEl.textContent = '✅ PDF loaded successfully!';
            statusEl.style.color = '#155724';

            // Clear success message after 3 seconds
            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        } else {
            throw new Error('No text found in PDF');
        }
    } catch (error) {
        console.error('PDF extraction error:', error);
        statusEl.textContent = '❌ Failed to read PDF: ' + error.message;
        statusEl.style.color = '#721c24';
    }
}

// Simple PDF text extraction using browser's native capabilities
async function extractTextFromPDF(file) {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Convert to Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to string (basic extraction)
    let text = '';

    // Try to extract text using a simple approach
    // This works for basic PDFs with extractable text
    try {
        // Convert bytes to string
        const decoder = new TextDecoder('utf-8');
        const rawText = decoder.decode(uint8Array);

        // Extract text between stream markers (basic PDF text extraction)
        const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
        let match;

        while ((match = streamRegex.exec(rawText)) !== null) {
            const streamContent = match[1];
            // Try to extract readable text
            const readableText = streamContent.replace(/[^\x20-\x7E\n]/g, ' ');
            text += readableText + '\n';
        }

        // If no text found, try alternative extraction
        if (!text.trim()) {
            // Look for text between parentheses (common in PDF text objects)
            const textRegex = /\(([^)]+)\)/g;
            let textMatch;
            while ((textMatch = textRegex.exec(rawText)) !== null) {
                text += textMatch[1] + ' ';
            }
        }

        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')
            .replace(/\\n/g, '\n')
            .trim();

        if (!text) {
            throw new Error('Could not extract text from PDF. The PDF might be image-based or encrypted.');
        }

        return text;

    } catch (error) {
        throw new Error('PDF parsing failed. Please copy and paste the text manually or use a simpler PDF format.');
    }
}

// Handle form submission
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = document.getElementById('apiKey').value.trim();
    const criteria = document.getElementById('criteria').value.trim();
    const statusEl = document.getElementById('status');

    if (!apiKey) {
        statusEl.textContent = '❌ Please enter an API key';
        statusEl.className = 'status error';
        return;
    }

    // Validate API key format
    if (!apiKey.startsWith('AIza')) {
        statusEl.textContent = '⚠️ API key should start with "AIza"';
        statusEl.className = 'status error';
        return;
    }

    try {
        // Save to chrome storage
        await chrome.storage.local.set({
            apiKey: apiKey,
            criteria: criteria || ''
        });

        statusEl.textContent = '✅ Settings saved successfully!';
        statusEl.className = 'status success';

        // Hide success message after 3 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);

    } catch (error) {
        statusEl.textContent = `❌ Error saving settings: ${error.message}`;
        statusEl.className = 'status error';
    }
});
