require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const axios = require('axios');
const { searchGoogle } = require('./googleSearch');
const { scrapeExternalArticle } = require('./scrapeExternalArticle');
const { rewriteWithLLM } = require('./rewriteWithLLM');

const BACKEND_API_BASE_URL =
    process.env.BACKEND_API_BASE_URL || 'http://localhost:5000/api';

const fetchAllArticles = async () => {
    try {
        console.log('\n📚 Fetching all articles from API...');
        const response = await axios.get(`${BACKEND_API_BASE_URL}/articles`);

        if (response.data.success && response.data.data) {
            const articles = response.data.data;
            console.log(`   ✅ Found ${articles.length} total articles`);
            return articles;
        }

        return [];
    } catch (error) {
        console.error(`   ❌ Error fetching articles: ${error.message}`);
        throw error;
    }
};

const publishRewrittenArticle = async (articleData) => {
    try {
        console.log(`   📤 Publishing rewritten article: "${articleData.title.substring(0, 50)}..."`);

        const response = await axios.post(`${BACKEND_API_BASE_URL}/articles`, {
            title: articleData.title,
            content: articleData.content,
            sourceUrl: articleData.sourceUrl,
            isUpdated: true,
            references: articleData.references,
        });

        if (response.data.success) {
            console.log(`   ✅ Successfully published with ID: ${response.data.data._id}`);
            return response.data.data;
        }

        throw new Error('Publish failed: ' + JSON.stringify(response.data));
    } catch (error) {
        if (error.response && error.response.status === 409) {
            console.log(`   ⚠️ Article already exists, skipping...`);
            return null;
        }
        console.error(`   ❌ Error publishing article: ${error.message}`);
        throw error;
    }
};

const processArticle = async (article, index, total, existingUpdatedUrls) => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 Processing Article ${index + 1}/${total}`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Source: ${article.sourceUrl}`);
    console.log('═'.repeat(60));

    // Check if updated article already exists for this original
    const baseSourceUrl = article.sourceUrl.replace(/#rewritten.*$/, '');
    const hasUpdatedVersion = existingUpdatedUrls.some(url =>
        url.startsWith(baseSourceUrl + '#rewritten')
    );

    if (hasUpdatedVersion) {
        console.log(`\n   ⏭️ Updated article already exists for this original. Skipping...`);
        return { success: false, reason: 'Updated version already exists' };
    }

    try {
        console.log('\n   Step 1: Search Google for related articles...');
        const searchResults = await searchGoogle(article.title);

        if (searchResults.length < 2) {
            console.log(`   ⚠️ Only found ${searchResults.length} valid external URLs. Skipping article.`);
            return { success: false, reason: 'Not enough reference URLs' };
        }

        console.log(`\n   Step 2: Scraping external articles...`);
        const scrapedArticles = [];

        for (const result of searchResults) {
            const scraped = await scrapeExternalArticle(result.url);
            if (scraped && scraped.content.length > 100) {
                scrapedArticles.push(scraped);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (scrapedArticles.length < 2) {
            console.log(`   ⚠️ Only scraped ${scrapedArticles.length} articles successfully. Skipping.`);
            return { success: false, reason: 'Failed to scrape enough references' };
        }

        console.log(`\n   Step 3: Rewriting with LLM...`);
        const rewrittenArticle = await rewriteWithLLM(article, scrapedArticles);

        console.log(`\n   Step 4: Publishing rewritten article...`);
        const newSourceUrl = `${article.sourceUrl}#rewritten-${Date.now()}`;

        const published = await publishRewrittenArticle({
            title: rewrittenArticle.title,
            content: rewrittenArticle.content,
            sourceUrl: newSourceUrl,
            references: rewrittenArticle.references,
        });

        if (published) {
            console.log(`\n   ✅ Article "${article.title}" processed successfully!`);
            return { success: true, publishedId: published._id };
        }

        return { success: false, reason: 'Already exists or publish failed' };
    } catch (error) {
        console.error(`\n   ❌ Error processing article: ${error.message}`);
        return { success: false, reason: error.message };
    }
};

const runPhase2 = async () => {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           PHASE 2: Article Enhancement Pipeline            ║');
    console.log('║     Fetch → Search → Scrape → Rewrite → Publish            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const requiredEnvVars = ['GOOGLE_SEARCH_API_KEY', 'GROQ_API_KEY'];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
        console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
        console.error('   Please set them in your .env file');
        process.exit(1);
    }

    console.log(`\n⚙️ Configuration:`);
    console.log(`   API Base URL: ${BACKEND_API_BASE_URL}`);
    console.log(`   Google Search API: Configured ✓`);
    console.log(`   Groq API: Configured ✓`);

    try {
        const allArticles = await fetchAllArticles();

        // Get existing updated article sourceUrls
        const existingUpdatedUrls = allArticles
            .filter(a => a.isUpdated === true)
            .map(a => a.sourceUrl);

        const articlesToProcess = allArticles.filter((a) => a.isUpdated === false);

        console.log(`\n📊 Original articles: ${articlesToProcess.length}`);
        console.log(`📊 Existing updated articles: ${existingUpdatedUrls.length}`);

        if (articlesToProcess.length === 0) {
            console.log('\n✅ No articles need processing. All articles are already updated.');
            return;
        }

        const results = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
        };

        for (let i = 0; i < articlesToProcess.length; i++) {
            const article = articlesToProcess[i];
            results.processed++;

            const result = await processArticle(article, i, articlesToProcess.length, existingUpdatedUrls);

            if (result.success) {
                results.succeeded++;
                // Add to existing URLs to prevent duplicates in same run
                existingUpdatedUrls.push(`${article.sourceUrl}#rewritten`);
            } else if (result.reason === 'Updated version already exists') {
                results.skipped++;
            } else {
                results.failed++;
            }

            if (i < articlesToProcess.length - 1) {
                console.log('\n   ⏳ Waiting 3 seconds before next article...');
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }

        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    PHASE 2 COMPLETE                        ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║   Total Processed: ${String(results.processed).padStart(3)}                                   ║`);
        console.log(`║   Succeeded:       ${String(results.succeeded).padStart(3)}                                   ║`);
        console.log(`║   Failed:          ${String(results.failed).padStart(3)}                                   ║`);
        console.log(`║   Skipped:         ${String(results.skipped).padStart(3)}                                   ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n');
    } catch (error) {
        console.error(`\n❌ Phase 2 failed: ${error.message}`);
        process.exit(1);
    }
};

runPhase2();
