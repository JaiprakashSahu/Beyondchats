# BeyondChats Backend

A Node.js + Express backend that scrapes articles from the BeyondChats blog, enhances them using AI, and provides full CRUD REST APIs for article management.

## 📋 Project Overview

This project consists of two phases:

**Phase 1:** Automatically scrapes the 5 oldest articles from [https://beyondchats.com/blogs/](https://beyondchats.com/blogs/), navigates to the last pagination page, extracts their full content, and stores them in MongoDB.

**Phase 2:** Enhances scraped articles by searching Google for top-ranking similar content, scraping reference articles, and using an LLM to rewrite articles with improved structure, SEO, and formatting.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **HTTP Client:** Axios
- **HTML Parser:** Cheerio
- **Environment:** dotenv
- **Security:** CORS
- **Search API:** Serper.dev (Google Search)
- **AI/LLM:** Groq (Llama 3.1 8B)

## 📁 Project Structure

```
beyondchats-backend/
│
├── src/
│   ├── app.js                 # Express server entry point
│   ├── config/
│   │   └── db.js              # MongoDB connection configuration
│   ├── models/
│   │   └── Article.js         # Mongoose Article schema
│   ├── controllers/
│   │   └── articleController.js  # CRUD controller logic
│   ├── routes/
│   │   └── articleRoutes.js   # API route definitions
│   ├── scraper/
│   │   └── scrapeBeyondChats.js  # Blog scraper module (Phase 1)
│   └── phase2/
│       ├── googleSearch.js       # Google search via Serper API
│       ├── scrapeExternalArticle.js  # External article scraper
│       ├── rewriteWithLLM.js     # Groq LLM rewriting (LLaMA 3.1 8B)
│       └── runPhase2.js          # Phase 2 runner script
│
├── .env                       # Environment variables (excluded from git)
├── .env.example               # Example environment file
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
└── README.md                  # Documentation
```

## 🚀 Local Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation Steps

1. **Clone/Navigate to the project:**
   ```bash
   cd beyondchats-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Edit the `.env` file with your settings:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/beyondchats
   ```
   
   For MongoDB Atlas, use your connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/beyondchats
   ```

4. **Start the server:**
   
   Development mode (with hot reload):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

5. **The scraper will automatically run on server startup** and fetch the 5 oldest articles from BeyondChats blog.

## 🔧 Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `PORT` | Server port number (default: 5000) | Phase 1 |
| `MONGODB_URI` | MongoDB connection string | Phase 1 |
| `GOOGLE_SEARCH_API_KEY` | Serper.dev API key | Phase 2 |
| `GROQ_API_KEY` | Groq API key | Phase 2 |
| `BACKEND_API_BASE_URL` | API base URL (default: http://localhost:5000/api) | Phase 2 |

### Getting API Keys

1. **Serper.dev (Google Search):** Sign up at [https://serper.dev/](https://serper.dev/) to get your API key
2. **Groq:** Get your API key from [https://console.groq.com/keys](https://console.groq.com/keys)

## 📡 API Endpoints

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/articles` | Create a new article |
| `GET` | `/api/articles` | Get all articles |
| `GET` | `/api/articles/:id` | Get article by ID |
| `PUT` | `/api/articles/:id` | Update article by ID |
| `DELETE` | `/api/articles/:id` | Delete article by ID |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check / API info |
| `POST` | `/api/scrape` | Manually trigger the scraper |

### Example Requests

**Create Article:**
```bash
curl -X POST http://localhost:5000/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Article",
    "content": "This is the article content...",
    "sourceUrl": "https://example.com/article",
    "references": ["https://ref1.com", "https://ref2.com"]
  }'
```

**Get All Articles:**
```bash
curl http://localhost:5000/api/articles
```

**Get Article by ID:**
```bash
curl http://localhost:5000/api/articles/<article_id>
```

**Update Article:**
```bash
curl -X PUT http://localhost:5000/api/articles/<article_id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content..."
  }'
```

**Delete Article:**
```bash
curl -X DELETE http://localhost:5000/api/articles/<article_id>
```

## 🕷️ Scraper Logic

The scraper (`scrapeBeyondChats.js`) performs the following steps:

1. **Fetch Blog Page:** Loads the main blog page at `https://beyondchats.com/blogs/`

2. **Detect Pagination:** Parses the page to find pagination elements and determines the last page number

3. **Navigate to Last Page:** Goes to the last pagination page (e.g., `/blogs/page/15/`) where the oldest articles reside

4. **Collect Article URLs:** Extracts article URLs from the last page. If fewer than 5 articles exist, it moves to previous pages to collect more

5. **Check for Duplicates:** Queries MongoDB to skip articles that already exist (based on `sourceUrl`)

6. **Scrape Full Content:** For each new article:
   - Fetches the article page
   - Extracts the title from `<h1>` element
   - Extracts the full article body from `.post-content` or `.entry-content`
   - Removes navigation, footer, ads, and other non-content elements
   - Collects external reference links

7. **Save to Database:** Stores each article with title, content, sourceUrl, references, and timestamps

8. **Duplicate Prevention:** Uses unique constraint on `sourceUrl` and double-checks before saving

The scraper runs automatically once when the server starts and can also be triggered manually via `POST /api/scrape`.

## 📊 Database Schema

```javascript
Article {
  title: String (required),
  content: String (required),
  sourceUrl: String (required, unique),
  isUpdated: Boolean (default: false),
  references: [String] (default: []),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## 🤖 Phase 2: Article Enhancement Pipeline

Phase 2 enhances the scraped articles by researching top-ranking content and using AI to rewrite them.

### Running Phase 2

1. **Ensure Phase 1 is complete** (server has run and scraped articles exist in MongoDB)

2. **Configure API keys** in your `.env` file:
   ```env
   GOOGLE_SEARCH_API_KEY=your_serper_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   BACKEND_API_BASE_URL=http://localhost:5000/api
   ```

3. **Start the server** (if not already running):
   ```bash
   npm run dev
   ```

4. **Run Phase 2 script:**
   ```bash
   node src/phase2/runPhase2.js
   ```

### Phase 2 Workflow

1. **Fetch Articles:** Gets all articles from `/api/articles` where `isUpdated = false`

2. **Google Search:** For each article title, searches Google via Serper.dev API

3. **Filter Results:**
   - Excludes beyondchats.com URLs
   - Excludes social media, Wikipedia, video platforms
   - Selects top 2 valid blog/article URLs

4. **Scrape References:** Extracts main content from each reference article:
   - Removes navigation, ads, footer, sidebars
   - Preserves headings and paragraph structure
   - Cleans whitespace

5. **LLM Rewrite:** Sends to Groq Llama 3.1 8B:
   - Improves clarity and structure
   - Matches formatting style of top-ranking articles
   - Ensures originality (no copying)
   - Generates SEO-optimized title

6. **Publish:** Creates new article via `POST /api/articles`:
   - `isUpdated = true`
   - `references = [url1, url2]`
   - Appends references section at bottom

### Phase 2 Output

The script provides detailed logging:
```
╔════════════════════════════════════════════════════════════╗
║           PHASE 2: Article Enhancement Pipeline            ║
╚════════════════════════════════════════════════════════════╝

📝 Processing Article 1/5
   Title: Introduction to Chatbots
   
   Step 1: Search Google for related articles...
   ✅ Found 2 valid external URLs
   
   Step 2: Scraping external articles...
   ✅ Scraped 3500 characters
   
   Step 3: Rewriting with LLM...
   ✅ LLM rewrite complete
   
   Step 4: Publishing rewritten article...
   ✅ Successfully published with ID: 507f1f77bcf86cd799439011

╔════════════════════════════════════════════════════════════╗
║                    PHASE 2 COMPLETE                        ║
║   Succeeded: 5                                             ║
╚════════════════════════════════════════════════════════════╝
```

### Idempotency

Phase 2 enforces a one-to-one mapping between original and updated articles. Re-running the script does not create duplicate updated articles.

### Notes

- `.env` files are excluded from version control; `.env.example` is provided for reference
- A duplicate index warning may appear during development due to schema refactoring; it does not affect functionality

## 📝 License

This project is provided for evaluation purposes as part of an internship assignment.
