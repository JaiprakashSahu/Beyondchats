# BeyondChats Backend

A Node.js + Express backend that scrapes the 5 oldest articles from the BeyondChats blog and provides full CRUD REST APIs for article management.

## 📋 Project Overview

This project automatically scrapes articles from [https://beyondchats.com/blogs/](https://beyondchats.com/blogs/), navigates to the last pagination page to find the oldest articles, extracts their full content, and stores them in MongoDB. It also exposes RESTful APIs for complete article management.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **HTTP Client:** Axios
- **HTML Parser:** Cheerio
- **Environment:** dotenv
- **Security:** CORS

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
│   └── scraper/
│       └── scrapeBeyondChats.js  # Blog scraper module
│
├── .env                       # Environment variables
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

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/beyondchats` |

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

## 📝 License

ISC
