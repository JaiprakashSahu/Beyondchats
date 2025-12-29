require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const articleRoutes = require('./routes/articleRoutes');
const scrapeBeyondChats = require('./scraper/scrapeBeyondChats');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

// Health check route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'BeyondChats Backend API is running',
        version: '1.0.0',
        endpoints: {
            articles: '/api/articles',
        },
    });
});

// API Routes
app.use('/api/articles', articleRoutes);

// Manual trigger for scraper (optional endpoint)
app.post('/api/scrape', async (req, res) => {
    try {
        console.log('🔄 Manual scrape triggered via API');
        const result = await scrapeBeyondChats();
        res.json({
            success: true,
            message: 'Scraping completed',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Scraping failed',
            error: error.message,
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 API endpoints available at http://localhost:${PORT}/api/articles`);
            console.log('━'.repeat(50));
        });

        // Auto-run scraper on server start
        console.log('\n🔄 Auto-running scraper on server start...');
        setTimeout(async () => {
            try {
                await scrapeBeyondChats();
            } catch (error) {
                console.error('❌ Initial scraping failed:', error.message);
                console.log('   Server will continue running. You can retry via POST /api/scrape');
            }
        }, 2000); // Small delay to ensure server is fully ready
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
