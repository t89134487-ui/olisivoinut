# Finnish Policy Analysis

This website scrapes political news from Yle (Finnish National Broadcaster) and provides AI-generated analysis (opinion columns) on the policies and choices mentioned in the news.

## Features

- **RSS Scraping:** Automatically fetches the latest news from Yle.
- **AI Analysis:** Uses Google Gemini 1.5 Flash to filter for policy-related news and generate balanced feedback in Finnish and English.
- **Multi-lingual:** Supports both English and Finnish interfaces and content.
- **Minimalist Design:** Clean, blog-like interface built with Solid JS and Tailwind CSS.
- **Automated Deployment:** GitHub Actions handles scraping and deployment to GitHub Pages hourly.

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

## Deployment to GitHub Pages

1. **Enable GitHub Actions for Pages:**
   - Go to your repository **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **GitHub Actions**.

2. **Add Gemini API Key:**
   - Go to **Settings** -> **Secrets and variables** -> **Actions**.
   - Create a new repository secret named `GOOGLE_API_KEY` with your Gemini API key.

3. **Trigger Workflow:**
   - The site will deploy automatically on push or on a schedule (every hour).
   - You can also manually trigger it from the **Actions** tab.

## Development

Run the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`.

## Build

Build the project manually for production:
```bash
npm run build
```

The static output will be in `dist`.
