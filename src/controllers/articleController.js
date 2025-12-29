const Article = require('../models/Article');

// @desc    Create a new article
// @route   POST /api/articles
// @access  Public
const createArticle = async (req, res) => {
    try {
        const { title, content, sourceUrl, isUpdated, references } = req.body;

        // Validate required fields
        if (!title || !content || !sourceUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please provide title, content, and sourceUrl',
            });
        }

        // Check if article with same sourceUrl already exists
        const existingArticle = await Article.findOne({ sourceUrl });
        if (existingArticle) {
            return res.status(409).json({
                success: false,
                message: 'Article with this source URL already exists',
            });
        }

        const article = await Article.create({
            title,
            content,
            sourceUrl,
            isUpdated: isUpdated === true,
            references: references || [],
        });

        res.status(201).json({
            success: true,
            message: 'Article created successfully',
            data: article,
        });
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating article',
            error: error.message,
        });
    }
};

// @desc    Get all articles
// @route   GET /api/articles
// @access  Public
const getAllArticles = async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: articles.length,
            data: articles,
        });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching articles',
            error: error.message,
        });
    }
};

// @desc    Get single article by ID
// @route   GET /api/articles/:id
// @access  Public
const getArticleById = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        }

        res.status(200).json({
            success: true,
            data: article,
        });
    } catch (error) {
        console.error('Error fetching article:', error);

        // Handle invalid ObjectId
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid article ID format',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while fetching article',
            error: error.message,
        });
    }
};

// @desc    Update article by ID
// @route   PUT /api/articles/:id
// @access  Public
const updateArticle = async (req, res) => {
    try {
        const { title, content, sourceUrl, isUpdated, references } = req.body;

        let article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        }

        // Check if updating sourceUrl and if it conflicts with another article
        if (sourceUrl && sourceUrl !== article.sourceUrl) {
            const existingArticle = await Article.findOne({ sourceUrl });
            if (existingArticle) {
                return res.status(409).json({
                    success: false,
                    message: 'Another article with this source URL already exists',
                });
            }
        }

        // Update fields
        article.title = title || article.title;
        article.content = content || article.content;
        article.sourceUrl = sourceUrl || article.sourceUrl;
        article.isUpdated = isUpdated !== undefined ? isUpdated : true;
        article.references = references || article.references;

        await article.save();

        res.status(200).json({
            success: true,
            message: 'Article updated successfully',
            data: article,
        });
    } catch (error) {
        console.error('Error updating article:', error);

        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid article ID format',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating article',
            error: error.message,
        });
    }
};

// @desc    Delete article by ID
// @route   DELETE /api/articles/:id
// @access  Public
const deleteArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        }

        await Article.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Article deleted successfully',
            data: { id: req.params.id },
        });
    } catch (error) {
        console.error('Error deleting article:', error);

        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid article ID format',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while deleting article',
            error: error.message,
        });
    }
};

module.exports = {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticle,
    deleteArticle,
};
