// Popup script

let currentDOI = null;
let paperContent = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await detectDOI();

    document.getElementById('analyzeBtn').addEventListener('click', analyzePaper);

    // Add settings button handler (gear icon in header)
    document.getElementById('settingsIconBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });
});

// Detect DOI on current page
async function detectDOI() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.tabs.sendMessage(tab.id, { action: 'detectDOI' }, (response) => {
            if (chrome.runtime.lastError) {
                showNoDOI();
                return;
            }

            if (response && response.doi) {
                currentDOI = response.doi;
                showDOIDetected(currentDOI);
            } else {
                showNoDOI();
            }
        });
    } catch (error) {
        console.error('Error detecting DOI:', error);
        showNoDOI();
    }
}

// Show DOI detected UI
function showDOIDetected(doi) {
    document.getElementById('noDOI').style.display = 'none';
    document.getElementById('doiInfo').style.display = 'block';
    document.getElementById('doiValue').textContent = doi;
}

// Show no DOI UI
function showNoDOI() {
    document.getElementById('noDOI').style.display = 'block';
    document.getElementById('doiInfo').style.display = 'none';
}

// Extract paper content
async function extractContent() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'extractContent' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response && response.content) {
                    resolve(response.content);
                } else {
                    reject(new Error('Failed to extract content'));
                }
            });
        });
    });
}

// Analyze paper using Gemini API
async function analyzePaper() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const results = document.getElementById('results');

    // Reset UI
    analyzeBtn.disabled = true;
    loading.style.display = 'block';
    error.style.display = 'none';
    results.classList.remove('show');

    try {
        // Extract paper content
        paperContent = await extractContent();

        if (!paperContent.fullText || paperContent.fullText.length < 100) {
            throw new Error('Unable to extract sufficient paper content from this page');
        }

        // Prepare prompt for Gemini
        const prompt = await createAnalysisPrompt(paperContent);

        // Call Gemini API
        const analysis = await callGeminiAPI(prompt);

        // Display results
        displayResults(analysis);

    } catch (err) {
        console.error('Analysis error:', err);
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    } finally {
        analyzeBtn.disabled = false;
        loading.style.display = 'none';
    }
}

// Create analysis prompt
async function createAnalysisPrompt(content) {
    const criteria = await getCriteria();

    return `You are a research paper analyzer. Analyze the following research paper against the provided criteria and provide a structured JSON response.

CRITERIA:
${criteria}

PAPER INFORMATION:
Title: ${content.title || 'N/A'}
Authors: ${content.authors || 'N/A'}
Year: ${content.year || 'N/A'}
DOI: ${currentDOI || 'N/A'}

Abstract:
${content.abstract || 'N/A'}

Full Text (first 8000 characters):
${content.fullText.substring(0, 8000)}

INSTRUCTIONS:
1. Analyze the paper against each criterion in the criteria list
2. Determine if the paper is RELEVANT, IRRELEVANT, or HIGHLY RELEVANT
3. Provide a confidence score (0-100)
4. Explain your reasoning

Respond ONLY with a valid JSON object in this exact format:
{
  "verdict": "RELEVANT" | "IRRELEVANT" | "HIGHLY RELEVANT",
  "confidence": 85,
  "criteriaAssessment": [
    {
      "criterion": "Topic Relevance",
      "met": true,
      "explanation": "Brief explanation"
    }
  ],
  "reasoning": "Detailed explanation of the verdict"
}`;
}

// Call Gemini API
async function callGeminiAPI(prompt) {
    const apiKey = await getApiKey();

    if (!apiKey) {
        throw new Error('API key not configured. Please go to extension settings.');
    }

    for (let geminiModel of GEMINI_MODELS) {
        console.log(`Trying Gemini model: ${geminiModel}`);
        try {
            const apiUrl = `${GEMINI_API_URL}${geminiModel}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 10000,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response from Gemini API');
            }

            const text = data.candidates[0].content.parts[0].text;

            // Extract JSON from response (handle markdown code blocks)
            let jsonText = text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            try {
                return JSON.parse(jsonText);
            } catch (e) {
                console.error('Failed to parse JSON:', jsonText);
                throw new Error('Failed to parse analysis results');
            }
        }
        catch (err) {
            console.warn(`Gemini model ${geminiModel} failed:`, err);
            if (geminiModel === GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
                throw err; // Rethrow if it's the last model
            }
        }
    }
    throw new Error('All Gemini models failed to provide a valid response');
}

// Display results
function displayResults(analysis) {
    const results = document.getElementById('results');
    const verdict = document.getElementById('verdict');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const criteriaList = document.getElementById('criteriaList');
    const reasoning = document.getElementById('reasoning');

    // Set verdict
    verdict.textContent = analysis.verdict;
    verdict.className = 'verdict';

    if (analysis.verdict === 'RELEVANT') {
        verdict.classList.add('relevant');
    } else if (analysis.verdict === 'IRRELEVANT') {
        verdict.classList.add('irrelevant');
    } else if (analysis.verdict === 'HIGHLY RELEVANT') {
        verdict.classList.add('highly-relevant');
    }

    // Set confidence
    confidenceFill.style.width = `${analysis.confidence}%`;
    confidenceValue.textContent = `${analysis.confidence}%`;

    // Set criteria assessment
    criteriaList.innerHTML = '';
    if (analysis.criteriaAssessment && analysis.criteriaAssessment.length > 0) {
        analysis.criteriaAssessment.forEach(item => {
            const li = document.createElement('li');
            li.className = `criteria-item ${item.met ? 'met' : 'not-met'}`;
            li.innerHTML = `<span><strong>${item.criterion}:</strong> ${item.explanation}</span>`;
            criteriaList.appendChild(li);
        });
    }

    // Set reasoning
    reasoning.textContent = analysis.reasoning;

    // Show results
    results.classList.add('show');
}