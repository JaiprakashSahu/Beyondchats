const axios = require('axios');

const normalizeContent = (content) => {
    return content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const stripExistingReferences = (content) => {
    return content.replace(/References[\s\S]*$/i, '').trim();
};

const rewriteWithLLM = async (originalArticle, referenceArticles) => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set in environment variables');
    }

    const ref1 = referenceArticles[0] || { title: '', content: '' };
    const ref2 = referenceArticles[1] || { title: '', content: '' };

    const systemPrompt = `You are an expert content writer and SEO specialist. Your task is to rewrite articles to improve their quality, structure, and SEO performance while maintaining originality.

Guidelines:
- Improve clarity, readability, and flow
- Use proper heading structure (H2, H3)
- Include bullet points and lists where appropriate
- Match the professional tone and formatting style of top-ranking articles
- Ensure 100% original content - no direct copying
- Keep the core topic and key information intact
- Make it engaging and informative
- Optimize for SEO without keyword stuffing
- Use short paragraphs for better readability
- Do NOT use markdown bold (**text**) formatting`;

    const userPrompt = `Please rewrite the following article to make it more engaging, well-structured, and SEO-friendly. Study the reference articles for formatting style and structure inspiration, but create completely original content.

=== ORIGINAL ARTICLE ===
Title: ${originalArticle.title}

Content:
${originalArticle.content.substring(0, 3000)}

=== REFERENCE ARTICLE 1 (for style/structure inspiration only) ===
Title: ${ref1.title}

Content (excerpt):
${ref1.content.substring(0, 1500)}

=== REFERENCE ARTICLE 2 (for style/structure inspiration only) ===
Title: ${ref2.title}

Content (excerpt):
${ref2.content.substring(0, 1500)}

=== INSTRUCTIONS ===
1. Create a new, improved version of the original article
2. Use the reference articles ONLY for formatting and structure inspiration
3. Write completely original content - do not copy from references
4. Improve the title for better SEO
5. Use proper markdown formatting (## for H2, ### for H3, bullet points, etc.)
6. Do NOT use bold (**text**) formatting
7. Make it comprehensive and valuable to readers
8. Do NOT include a References section - it will be added automatically

Please provide your response in the following format:
TITLE: <improved SEO-friendly title>

CONTENT:
<rewritten article content with proper markdown formatting>`;

    try {
        console.log(`      🤖 Sending to Groq LLM for rewriting...`);

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 2000,
                temperature: 0.7,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 120000,
            }
        );

        const llmResponse = response.data.choices[0].message.content;

        let newTitle = originalArticle.title;
        let newContent = llmResponse;

        const titleMatch = llmResponse.match(/TITLE:\s*(.+?)(?:\n|CONTENT:)/s);
        if (titleMatch) {
            newTitle = titleMatch[1].trim();
        }

        const contentMatch = llmResponse.match(/CONTENT:\s*([\s\S]+)/);
        if (contentMatch) {
            newContent = contentMatch[1].trim();
        }

        const normalizedContent = normalizeContent(newContent);
        const contentWithoutRefs = stripExistingReferences(normalizedContent);

        const references = referenceArticles.map((ref) => ref.url).filter(Boolean);

        const finalContent = `${contentWithoutRefs}

References:
1. ${references[0] || ''}
2. ${references[1] || ''}`.trim();

        console.log(`      ✅ Groq LLM rewrite complete (${finalContent.length} characters)`);

        return {
            title: newTitle,
            content: finalContent,
            references,
        };
    } catch (error) {
        if (error.response) {
            console.error(
                `      ❌ Groq API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
            );
        } else {
            console.error(`      ❌ Groq LLM error: ${error.message}`);
        }
        throw error;
    }
};

module.exports = {
    rewriteWithLLM,
};
