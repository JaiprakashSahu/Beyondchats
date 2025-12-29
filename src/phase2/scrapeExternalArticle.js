const axios = require('axios');
const cheerio = require('cheerio');

const fetchHTML = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
            },
            timeout: 20000,
            maxRedirects: 5,
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
};

const cleanText = (text) => {
    if (!text) return '';

    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/\t/g, ' ')
        .trim();
};

const scrapeExternalArticle = async (url) => {
    try {
        console.log(`      📄 Scraping: ${url}`);

        const restrictedDomains = ['medium.com', 'chatbotsmagazine.com'];
        const lowerUrl = url.toLowerCase();
        for (const domain of restrictedDomains) {
            if (lowerUrl.includes(domain)) {
                throw new Error('Skipped due to SSL restrictions');
            }
        }

        const html = await fetchHTML(url);
        const $ = cheerio.load(html);

        $(
            'nav, header, footer, aside, script, style, noscript, iframe, ' +
            '.advertisement, .ad, .ads, .sidebar, .comments, .comment, ' +
            '.social-share, .social, .related-posts, .related, .newsletter, ' +
            '.popup, .modal, .cookie, .banner, .menu, .navigation, ' +
            '[role="navigation"], [role="banner"], [role="complementary"], ' +
            '.author-bio, .author-box, .breadcrumb, .pagination, ' +
            '.wp-block-embed, .embed, video, audio, form, button, input, ' +
            '.share-buttons, .tags, .categories, .meta, .post-meta'
        ).remove();

        let title = '';
        const titleSelectors = [
            'h1.entry-title',
            'h1.post-title',
            'h1.article-title',
            'article h1',
            '.post h1',
            '.content h1',
            'h1',
        ];

        for (const selector of titleSelectors) {
            const el = $(selector).first();
            if (el.length && el.text().trim()) {
                title = cleanText(el.text());
                break;
            }
        }

        let content = '';
        const contentSelectors = [
            'article .entry-content',
            'article .post-content',
            'article .content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.blog-content',
            '.content-area',
            'article',
            '.post',
            'main',
        ];

        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length) {
                const paragraphs = [];

                element.find('h2, h3, h4, h5, h6').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text && text.length > 2) {
                        const tagName = el.tagName.toLowerCase();
                        if (tagName === 'h2') {
                            paragraphs.push(`\n## ${text}\n`);
                        } else if (tagName === 'h3') {
                            paragraphs.push(`\n### ${text}\n`);
                        } else {
                            paragraphs.push(`\n#### ${text}\n`);
                        }
                    }
                });

                element.find('p').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text && text.length > 20) {
                        paragraphs.push(text);
                    }
                });

                element.find('li').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text && text.length > 10) {
                        paragraphs.push(`• ${text}`);
                    }
                });

                if (paragraphs.length > 0) {
                    content = paragraphs.join('\n\n');
                    break;
                }

                const plainText = element.text().trim();
                if (plainText.length > 200) {
                    content = cleanText(plainText);
                    break;
                }
            }
        }

        if (!content || content.length < 100) {
            const bodyText = $('body').text();
            content = cleanText(bodyText).substring(0, 5000);
        }

        content = content.substring(0, 8000);

        console.log(
            `      ✅ Scraped ${content.length} characters from ${url.substring(0, 50)}...`
        );

        return {
            url,
            title: title || 'Untitled',
            content,
        };
    } catch (error) {
        console.error(`      ❌ Scrape error for ${url}: ${error.message}`);
        return null;
    }
};

module.exports = {
    scrapeExternalArticle,
};
