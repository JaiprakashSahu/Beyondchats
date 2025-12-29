const express = require('express');
const router = express.Router();
const {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticle,
    deleteArticle,
} = require('../controllers/articleController');

// POST /api/articles - Create a new article
router.post('/', createArticle);

// GET /api/articles - Get all articles
router.get('/', getAllArticles);

// GET /api/articles/:id - Get article by ID
router.get('/:id', getArticleById);

// PUT /api/articles/:id - Update article by ID
router.put('/:id', updateArticle);

// DELETE /api/articles/:id - Delete article by ID
router.delete('/:id', deleteArticle);

module.exports = router;
