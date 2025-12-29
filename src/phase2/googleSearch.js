const axios = require('axios');

const SERPER_API_URL = 'https://google.serper.dev/search';

const isValidExternalUrl = (url) => {
    if (!url || typeof url !== 'string') return false;

    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('beyondchats.com')) return false;

    const excludedDomains = [
        'youtube.com',
        'twitter.com',
        'x.com',
        'facebook.com',
        'instagram.com',
        'linkedin.com',
        'pinterest.com',
        'tiktok.com',
        'reddit.com',
        'quora.com',
        'wikipedia.org',
        'amazon.com',
        'ebay.com',
        'google.com',
        'bing.com',
        'yahoo.com',
    ];

    for (const domain of excludedDomains) {
        if (lowerUrl.includes(domain)) return false;
    }

    const blogIndicators = [
        'blog',
        'article',
        'post',
        'news',
        'guide',
        'tutorial',
        'how-to',
        'tips',
        'insights',
        'stories',
        '/20',
    ];

    const hasHttps = lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://');
    const hasBlogIndicator = blogIndicators.some((indicator) => lowerUrl.includes(indicator));
    const hasContentPath = lowerUrl.split('/').length > 3;

    return hasHttps && (hasBlogIndicator || hasContentPath);
};

const searchGoogle = async (query, numResults = 5) => {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_SEARCH_API_KEY is not set in environment variables');
    }

    try {
        console.log(`   🔍 Searching Google for: "${query}"`);

        const response = await axios.post(
            SERPER_API_URL,
            {
                q: query,
                num: numResults * 2,
            },
            {
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );

        const results = response.data.organic || [];

        const validUrls = [];

        for (const result of results) {
            const url = result.link;
            if (isValidExternalUrl(url)) {
                validUrls.push({
                    url,
                    title: result.title || '',
                    snippet: result.snippet || '',
                });

                if (validUrls.length >= 2) break;
            }
        }

        console.log(`   ✅ Found ${validUrls.length} valid external URLs`);

        return validUrls;
    } catch (error) {
        console.error(`   ❌ Google search error: ${error.message}`);
        throw error;
    }
};

module.exports = {
    searchGoogle,
    isValidExternalUrl,
};
