const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Article title is required'],
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Article content is required'],
        },
        sourceUrl: {
            type: String,
            required: [true, 'Source URL is required'],
            unique: true,
            trim: true,
        },
        isUpdated: {
            type: Boolean,
            default: false,
        },
        references: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookups by sourceUrl
articleSchema.index({ sourceUrl: 1 });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
