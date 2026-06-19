# Finnish Policy Analysis

This website scrapes political news from Yle (Finnish National Broadcaster) and provides AI-generated analysis (opinion columns) on the policies and choices mentioned in the news.

## Features

- **RSS Scraping:** Automatically fetches the latest news from Yle.
- **AI Analysis:** Uses Google Gemini 1.5 Flash to filter for policy-related news and generate balanced feedback in Finnish and English.
- **Multi-lingual:** Supports both English and Finnish interfaces and content.
- **Minimalist Design:** Clean, blog-like interface built with SolidStart and Tailwind CSS.

## Prerequisites

- Node.js (v22 or later recommended)
- A Google Gemini API Key

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory and add your Google Gemini API key:
   ```env
   GOOGLE_API_KEY=your_api_key_here
   ```

3. **Scrape data:**
   Run the manual scraper to populate the website with the latest news and AI analysis:
   ```bash
   npm run scrape
   ```
   This will update `src/data/news.json`.

## Development

Run the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`.

## Deployment

Build the project for production:
```bash
npm run build
```

The output will be in the `.output` directory.
