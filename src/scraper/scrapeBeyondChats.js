const axios = require('axios');
const cheerio = require('cheerio');
const Article = require('../models/Article');

const BASE_URL = 'https://beyondchats.com/blogs/';
const ARTICLES_TO_SCRAPE = 5;

/**
 * Fetch HTML content from a URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} - HTML content
 */
const fetchHTML = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 30000,
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching ${url}:`, error.message);
        throw error;
    }
};

/**
 * Get the last pagination page number
 * @param {string} html - HTML content of the blog listing page
 * @returns {number} - Last page number
 */
const getLastPageNumber = (html) => {
    const $ = cheerio.load(html);

    // Find pagination elements - look for page numbers in the pagination container
    const pageNumbers = [];

    // Try different pagination selectors
    $('.ct-pagination a, .page-numbers, .pagination a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();

        // Extract page number from URL pattern /page/N/
        const urlMatch = href.match(/\/page\/(\d+)\/?/);
        if (urlMatch) {
            pageNumbers.push(parseInt(urlMatch[1], 10));
        }

        // Also try to get page number from text if it's a number
        const numFromText = parseInt(text, 10);
        if (!isNaN(numFromText)) {
            pageNumbers.push(numFromText);
        }
    });

    if (pageNumbers.length === 0) {
        console.log('⚠️ No pagination found, assuming single page');
        return 1;
    }

    const lastPage = Math.max(...pageNumbers);
    console.log(`📄 Found ${lastPage} total pages`);
    return lastPage;
};

/**
 * Get article URLs from a blog listing page
 * @param {string} html - HTML content of the listing page
 * @returns {string[]} - Array of article URLs
 */
const getArticleUrls = (html) => {
    const $ = cheerio.load(html);
    const urls = [];

    // Use .entry-title a selector to get article links
    $('.entry-title a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/blogs/') && !href.endsWith('/blogs/')) {
            urls.push(href);
        }
    });

    // Fallback: try h2 a if no results
    if (urls.length === 0) {
        $('h2 a').each((_, el) => {
            const href = $(el).attr('href');
            if (
                href &&
                href.includes('/blogs/') &&
                !href.endsWith('/blogs/') &&
                !href.includes('/page/')
            ) {
                urls.push(href);
            }
        });
    }

    return urls;
};

/**
 * Scrape full article content from an article page
 * @param {string} url - Article URL
 * @returns {Promise<Object|null>} - Article data or null if failed
 */
const scrapeArticle = async (url) => {
    try {
        console.log(`   📖 Scraping: ${url}`);
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);

        // Get title from h1
        let title = $('h1').first().text().trim();
        if (!title) {
            title = $('.entry-title').first().text().trim();
        }

        // Get content from post-content or entry-content
        let content = '';

        // Try multiple content selectors
        const contentSelectors = [
            '.post-content',
            '.entry-content',
            '.elementor-widget-theme-post-content .elementor-widget-container',
            'article .elementor-section',
        ];

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                // Remove unwanted elements (navigation, footer, scripts, styles, ads)
                element
                    .find(
                        'nav, footer, script, style, .advertisement, .ad, .sidebar, .comments, .related-posts, .social-share, header, .navigation'
                    )
                    .remove();

                // Get text content, preserving paragraph breaks
                const paragraphs = [];
                element.find('p, h2, h3, h4, h5, h6, li').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text && text.length > 0) {
                        paragraphs.push(text);
                    }
                });

                if (paragraphs.length > 0) {
                    content = paragraphs.join('\n\n');
                    break;
                }

                // Fallback to plain text
                content = element.text().trim();
                if (content.length > 100) {
                    break;
                }
            }
        }

        // Clean up content - remove excessive whitespace
        content = content
            .replace(/\s+/g, ' ')
            .replace(/\n\s+\n/g, '\n\n')
            .trim();

        // Extract references (links in the article)
        const references = [];
        $('.post-content a, .entry-content a').each((_, el) => {
            const href = $(el).attr('href');
            if (
                href &&
                href.startsWith('http') &&
                !href.includes('beyondchats.com')
            ) {
                references.push(href);
            }
        });

        if (!title || !content) {
            console.log(`   ⚠️ Could not extract complete data from ${url}`);
            return null;
        }

        return {
            title,
            content,
            sourceUrl: url,
            references: [...new Set(references)], // Remove duplicates
        };
    } catch (error) {
        console.error(`   ❌ Error scraping article ${url}:`, error.message);
        return null;
    }
};

/**
 * Main scraper function - scrapes the 5 oldest articles from BeyondChats blog
 */
const scrapeBeyondChats = async () => {
    console.log('\n🚀 Starting BeyondChats Blog Scraper...');
    console.log('━'.repeat(50));

    try {
        // Step 1: Get the main blog page to find pagination
        console.log('\n📌 Step 1: Fetching blog page to detect pagination...');
        const mainPageHtml = await fetchHTML(BASE_URL);
        const lastPageNumber = getLastPageNumber(mainPageHtml);

        // Step 2: Collect article URLs from the last pages (oldest first)
        console.log(
            `\n📌 Step 2: Collecting article URLs from the last page(s)...`
        );
        const allArticleUrls = [];
        let currentPage = lastPageNumber;

        // Start from the last page and work backwards if needed
        while (allArticleUrls.length < ARTICLES_TO_SCRAPE && currentPage >= 1) {
            const pageUrl =
                currentPage === 1 ? BASE_URL : `${BASE_URL}page/${currentPage}/`;
            console.log(`   Fetching page ${currentPage}: ${pageUrl}`);

            try {
                const pageHtml = await fetchHTML(pageUrl);
                const pageUrls = getArticleUrls(pageHtml);

                if (pageUrls.length > 0) {
                    console.log(`   Found ${pageUrls.length} articles on page ${currentPage}`);

                    // For the last page and previous pages, articles are in chronological order
                    // (oldest at top of last page, newest at bottom)
                    // But we want the oldest ones, so we take from the end of the last page first
                    // Actually the page shows newest first per page, so on last page, bottom articles are oldest

                    if (currentPage === lastPageNumber) {
                        // On the last page, articles at the bottom are oldest
                        // Reverse to get oldest first
                        allArticleUrls.push(...pageUrls.reverse());
                    } else {
                        // On previous pages, add all and continue
                        allArticleUrls.push(...pageUrls.reverse());
                    }
                }
            } catch (error) {
                console.error(`   Error fetching page ${currentPage}:`, error.message);
            }

            currentPage--;
        }

        // Get only the first 5 (oldest)
        const oldestArticleUrls = allArticleUrls.slice(0, ARTICLES_TO_SCRAPE);
        console.log(
            `\n📋 Found ${oldestArticleUrls.length} oldest article URLs to scrape:`
        );
        oldestArticleUrls.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));

        // Step 3: Check which articles already exist in database
        console.log('\n📌 Step 3: Checking for existing articles in database...');
        const existingUrls = await Article.find({
            sourceUrl: { $in: oldestArticleUrls },
        }).select('sourceUrl');
        const existingUrlSet = new Set(existingUrls.map((a) => a.sourceUrl));

        const newUrls = oldestArticleUrls.filter((url) => !existingUrlSet.has(url));
        console.log(`   ${existingUrlSet.size} articles already exist in database`);
        console.log(`   ${newUrls.length} new articles to scrape`);

        if (newUrls.length === 0) {
            console.log('\n✅ All articles already exist in database. Nothing to scrape.');
            console.log('━'.repeat(50));
            return { scraped: 0, skipped: oldestArticleUrls.length };
        }

        // Step 4: Scrape each new article
        console.log('\n📌 Step 4: Scraping article content...');
        const scrapedArticles = [];

        for (const url of newUrls) {
            const articleData = await scrapeArticle(url);
            if (articleData) {
                scrapedArticles.push(articleData);
            }
            // Small delay to be respectful to the server
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Step 5: Save articles to database
        console.log('\n📌 Step 5: Saving articles to database...');
        let savedCount = 0;

        for (const articleData of scrapedArticles) {
            try {
                // Double-check to avoid duplicates
                const exists = await Article.findOne({ sourceUrl: articleData.sourceUrl });
                if (!exists) {
                    const article = new Article(articleData);
                    await article.save();
                    console.log(`   ✅ Saved: ${articleData.title}`);
                    savedCount++;
                } else {
                    console.log(`   ⏭️ Skipped (duplicate): ${articleData.title}`);
                }
            } catch (error) {
                console.error(`   ❌ Error saving article: ${error.message}`);
            }
        }

        console.log('\n━'.repeat(50));
        console.log(`🎉 Scraping complete!`);
        console.log(`   📊 Total scraped: ${savedCount} articles`);
        console.log(`   ⏭️ Total skipped: ${oldestArticleUrls.length - savedCount} articles`);
        console.log('━'.repeat(50) + '\n');

        return {
            scraped: savedCount,
            skipped: oldestArticleUrls.length - savedCount,
        };
    } catch (error) {
        console.error('\n❌ Scraper error:', error.message);
        throw error;
    }
};

module.exports = scrapeBeyondChats;
