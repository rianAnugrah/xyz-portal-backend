# Analytics API Documentation

## Base URL
All endpoints are prefixed with your server's base URL + `/analytics`

---

## 📊 Data Collection

### POST `/analytics`
**Save analytics data to the database**

#### Request Body
```json
{
  "visitorId": "string (required)",
  "sessionId": "string (optional)",
  "ip": "string (required)",
  "userAgent": "string (required)",
  "platform": "string (required)",
  "browser": "string (required)",
  "device": "string (required)",
  "os": "string (required)",
  "screenWidth": "number (optional)",
  "screenHeight": "number (optional)",
  "referrer": "string (optional)",
  "referrerUrl": "string (optional)",
  "pathname": "string (optional)",
  "url": "string (required)",
  "type": "string (required)",
  "is_article_page": "boolean (optional)",
  "category_slug": "string (optional)",
  "article_id": "string (optional)",
  "article_slug": "string (optional)",
  "tag_list": "string[] (optional)",
  "timestamp": "string (optional)",
  "exitedAt": "string (optional)",
  "duration": "number (optional)",
  "platform_id": "number (optional)",
  "country": "string (optional)"
}
```

#### Response
```json
{
  "message": "Data analytics berhasil disimpan."
}
```

---

## 📈 Basic Analytics

### GET `/analytics`
**Get analytics logs with optional filtering**

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by analytics type |
| `date_from` | string | Start date (YYYY-MM-DD) |
| `date_to` | string | End date (YYYY-MM-DD) |
| `ip` | string | Filter by IP address |
| `visitorId` | string | Filter by visitor ID |
| `limit` | string | Number of records to return |

#### Response
```json
{
  "message": "Berhasil ambil data.",
  "data": [
    {
      "visitor_id": "12345",
      "ip": "192.168.1.1",
      "url": "https://example.com",
      "created_at": "2024-01-15T10:30:00Z",
      // ... other analytics fields
    }
  ]
}
```

---

## 📊 Chart Data

### GET `/analytics/chart/daily`
**Get daily visitor statistics**

#### Response
```json
{
  "message": "Daily chart generated.",
  "data": [
    {
      "date": "2024-01-15",
      "totalVisitors": 150,
      "uniqueVisitors": 85,
      "duration": 125.50
    }
  ]
}
```

### GET `/analytics/chart/weekly`
**Get weekly visitor statistics**

#### Response
```json
{
  "message": "Weekly chart generated.",
  "data": [
    {
      "week": "2024-W03",
      "count": 750
    }
  ]
}
```

### GET `/analytics/chart/monthly`
**Get monthly visitor statistics**

#### Response
```json
{
  "message": "Monthly chart generated.",
  "data": [
    {
      "month": "2024-01",
      "count": 3250
    }
  ]
}
```

### GET `/analytics/chart/weekly-progress`
**Get weekly progress with growth metrics**

#### Response
```json
{
  "message": "Weekly progress generated.",
  "data": [
    {
      "week": "2024-W03",
      "current": 750,
      "previous": 680,
      "growth": 10.29
    }
  ]
}
```

### GET `/analytics/chart/date-range`
**Get chart data for custom date range**

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_from` | string | Last 30 days | Start date (YYYY-MM-DD) |
| `date_to` | string | Today | End date (YYYY-MM-DD) |
| `group_by` | string | `day` | Grouping: `day`, `week`, `month` |

#### Response
```json
{
  "message": "Chart data berhasil diambil.",
  "data": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "groupBy": "day",
    "chartData": [
      {
        "date": "2024-01-15",
        "totalVisitors": 150,
        "uniqueVisitors": 85,
        "duration": 125.50
      }
    ]
  }
}
```

---

## ⏱️ Duration Analytics

### GET `/analytics/duration-summary`
**Get visit duration summary statistics**

#### Response
```json
{
  "message": "Durasi summary berhasil diambil.",
  "data": {
    "totalVisit": 1500,
    "totalDuration": 187500,
    "avgDuration": 125.0
  }
}
```

---

## 👥 User Analytics

### GET `/analytics/users/article-count`
**Get article creation statistics per user**

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | string | `50` | Number of users to return |
| `order_by` | string | `article_count` | Sort by: `article_count`, `user_name`, `created_at` |
| `order_direction` | string | `desc` | Sort direction: `asc`, `desc` |
| `date_from` | string | - | Filter articles from date (YYYY-MM-DD) |
| `date_to` | string | - | Filter articles to date (YYYY-MM-DD) |

#### Response
```json
{
  "message": "Data statistik artikel per user berhasil diambil.",
  "data": {
    "summary": {
      "totalUsers": 25,
      "totalArticles": 340,
      "avgArticlesPerUser": 13.6
    },
    "users": [
      {
        "userId": "123",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "userCreatedAt": "2024-01-01T00:00:00Z",
        "articleCount": 45,
        "latestArticleDate": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

## 📰 Article Analytics

### GET `/analytics/articles/views`
**Get view statistics per article**

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | string | `50` | Number of articles to return |
| `order_by` | string | `view_count` | Sort by: `view_count`, `article_title`, `created_at` |
| `order_direction` | string | `desc` | Sort direction: `asc`, `desc` |
| `date_from` | string | - | Filter views from date (YYYY-MM-DD) |
| `date_to` | string | - | Filter views to date (YYYY-MM-DD) |

#### Response
```json
{
  "message": "Data statistik views per artikel berhasil diambil.",
  "data": {
    "summary": {
      "totalArticles": 25,
      "totalViews": 1850,
      "avgViewsPerArticle": 74.0
    },
    "articles": [
      {
        "articleId": "123",
        "title": "Breaking News: Technology Update",
        "slug": "tech-update-2024",
        "category": { /* jsonb data */ },
        "authorName": "Jane Smith",
        "createdAt": "2024-01-10T00:00:00Z",
        "viewCount": 156, // From analytics logs
        "totalViews": 180, // From database
        "latestViewDate": "2024-01-15T14:30:00Z"
      }
    ]
  }
}
```

---

## 🏷️ Category Analytics

### GET `/analytics/categories/views`
**Get view statistics per category**

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | string | `50` | Number of categories to return |
| `order_by` | string | `view_count` | Sort by: `view_count`, `category_name`, `created_at` |
| `order_direction` | string | `desc` | Sort direction: `asc`, `desc` |
| `date_from` | string | - | Filter views from date (YYYY-MM-DD) |
| `date_to` | string | - | Filter views to date (YYYY-MM-DD) |

#### Response
```json
{
  "message": "Data statistik views per kategori berhasil diambil.",
  "data": {
    "summary": {
      "totalCategories": 7,
      "totalViews": 892,
      "avgViewsPerCategory": 127.43
    },
    "categories": [
      {
        "categoryId": 1532,
        "categoryName": "Technology",
        "categorySlug": "technology",
        "viewCount": 245
      },
      {
        "categoryId": 4592,
        "categoryName": "Entertainment",
        "categorySlug": "entertainment",
        "viewCount": 189
      }
    ]
  }
}
```

---

## 🔧 Usage Examples

### Basic Analytics Collection
```javascript
// Log a page view
await fetch('/analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visitorId: 'visitor-123',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    platform: 'web',
    browser: 'Chrome',
    device: 'desktop',
    os: 'Windows',
    url: 'https://example.com/article/tech-news',
    type: 'page_view',
    is_article_page: true,
    article_id: '456',
    category_slug: 'Technology'
  })
})
```

### Get Top Articles This Month
```javascript
// Get top 10 most viewed articles this month
const response = await fetch('/analytics/articles/views?' + new URLSearchParams({
  limit: '10',
  order_by: 'view_count',
  order_direction: 'desc',
  date_from: '2024-01-01',
  date_to: '2024-01-31'
}))
```

### Get Category Performance
```javascript
// Get category views for last week
const response = await fetch('/analytics/categories/views?' + new URLSearchParams({
  date_from: '2024-01-08',
  date_to: '2024-01-14',
  order_by: 'view_count'
}))
```

### Get Daily Chart Data
```javascript
// Get daily stats for custom date range
const response = await fetch('/analytics/chart/date-range?' + new URLSearchParams({
  date_from: '2024-01-01',
  date_to: '2024-01-31',
  group_by: 'day'
}))
```

---

## 📝 Notes

### Data Filtering
- All endpoints automatically exclude `null` and empty values for better data quality
- Date filters use ISO format: `YYYY-MM-DD`
- Date ranges are inclusive (includes both start and end dates)

### Performance
- Large queries are automatically batched to prevent "URI too long" errors
- Batch size is set to 100 records per batch for optimal performance

### Category Matching
- The `category_slug` field in analytics logs contains category **names**, not slugs
- The system automatically matches analytics data to categories by name
- Duplicate categories with the same name are grouped together

### Error Handling
- All endpoints return appropriate HTTP status codes
- Error messages are in Indonesian ("Bahasa Indonesia")
- Validation errors include detailed error descriptions

---

## 🚀 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Server Error |

---

*Last updated: January 2024* 