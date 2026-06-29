import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const RSS_URL = 'https://yle.fi/rss/tuoreimmat';
const DATA_PATH = path.join(process.cwd(), 'src/data/news.json');

const parser = new Parser();

const EXCLUDED_CATEGORIES = [
  'Urheilu',
  'Kulttuuri',
  'Viihde',
  'Sää',
  'Elämäntapa',
  'Lifestyle',
  'Pelimusiikki',
  'Taide',
  'Kuvataide',
  'Musiikki',
  'Elokuvat',
  'Televisio',
  'Radio',
];

const INCLUDED_CATEGORIES = [
  'Politiikka',
  'Talous',
  'Kunnat',
  'Eduskunta',
  'Hallitus',
  'Työmarkkinat',
  'Ulkopolitiikka',
  'Sisäpolitiikka',
  'Sote',
  'Koulutus',
  'Sosiaalipolitiikka',
  'Ympäristöpolitiikka',
  'Eurooppa-politiikka',
  'Maahanmuutto',
  'Puolustuspolitiikka',
  'Turvallisuuspolitiikka',
  'Lainsäädäntö',
  'Verotus',
  'Budjetti',
  'Kuntatalous',
  'Aluepolitiikka',
  'Kuntavaalit',
  'Aluevaalit',
  'Eduskuntavaalit',
  'Presidentinvaalit',
  'Eurovaalit',
  'Vaalit',
  'Oikeuspolitiikka',
  'Energiapolitiikka',
  'Elinkeinopolitiikka',
  'Maatalouspolitiikka',
  'Kaupunki-politiikka',
];

const NewsItemSchema = z.object({
  id: z.string(),
  sourceUrl: z.string(),
  title: z.object({
    fi: z.string(),
    en: z.string(),
  }),
  originalSummary: z.string(),
  originalStatement: z.object({
    fi: z.string(),
    en: z.string(),
  }),
  analysis: z.object({
    fi: z.string(),
    en: z.string(),
  }),
  publishedAt: z.string(),
  category: z.string(),
  isFromSummary: z.boolean().optional(),
});

type NewsItem = z.infer<typeof NewsItemSchema>;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-flash-lite-latest',
  generationConfig: {
    responseMimeType: 'application/json',
  },
});

async function fetchFullArticle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);

    // Target the main article content in Yle
    const content = $('.yle__article__content');
    if (content.length === 0) return null;

    // Remove unwanted elements if necessary (e.g., ads, related links)
    // For now, just get all paragraph text
    const paragraphs = content.find('p').map((_, el) => $(el).text()).get();
    const fullText = paragraphs.join('\n\n');

    return fullText.trim() || null;
  } catch (error) {
    console.error(`Error fetching full article from ${url}:`, error);
    return null;
  }
}

async function analyzeArticle(title: string, content: string) {
  const prompt = `
    You are an expert political analyst. I will provide you with a news headline and the full content (or summary) of an article from Yle (Finnish national broadcaster).

    Article Title: ${title}
    Article Content: ${content}

    Tasks:
    1. Determine if this article is about political policy choices, legislative changes, government decisions (e.g., tax changes, social security reforms, new laws), or includes significant opinions/statements from politicians.
    2. IGNORE articles that are general overviews of current events, daily summaries, morning roundups, or lists of news from different regions. Only focus on specific policy proposals, legislative actions, or major political statements.
    3. If it IS policy-related or political, extract the core proposal or quote from the article as the "Original Statement". This must be in both Finnish and English.
    4. Provide an extensive, highly critical feedback/analysis (several paragraphs) in both Finnish and English.
       - Your analysis should follow this logical flow:
         1. What is being suggested or stated?
         2. Why is it being suggested (what is the underlying political or economic motivation)?
         3. Why is this suggestion problematic, wrong, or ineffective?
       - IMPORTANT: Your criticism must be your own independent analytical opinion. Do NOT simply repeat viewpoints or expert opinions from within the article. Think through the policy yourself and highlight its flaws, unintended consequences, or logical inconsistencies.
       - Focus on providing a deep, critical dive into the policy impact.
    5. Translate the original title to English if it is in Finnish.

    Respond ONLY in the following JSON format:
    {
      "isPolicyRelated": boolean,
      "titleEn": "Translated Title",
      "originalStatementFi": "Extracted core proposal or quote in Finnish",
      "originalStatementEn": "Extracted core proposal or quote in English",
      "analysisFi": "Extensive Finnish feedback/analysis (multi-paragraph)",
      "analysisEn": "Extensive English feedback/analysis (multi-paragraph)",
      "category": "e.g. Economics, Social Policy, Environment"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);
    console.log(`Analysis result for "${title}": isPolicyRelated=${parsed.isPolicyRelated}`);
    return parsed;
  } catch (error) {
    console.error('Error analyzing article:', error);
    return null;
  }
}

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY not found. Skipping scraping and AI processing.');
    process.exit(0);
  }

  console.log('Fetching RSS feed...');
  const feed = await parser.parseURL(RSS_URL);

  let existingData: NewsItem[] = [];
  try {
    const fileContent = await fs.readFile(DATA_PATH, 'utf-8');
    existingData = JSON.parse(fileContent);
  } catch (e) {}

  const existingIds = new Set(existingData.map(item => item.id));

  for (const item of feed.items) {
    const id = item.guid || item.link || '';
    if (existingIds.has(id)) continue;

    const categories = item.categories || [];
    const hasExcluded = categories.some(cat => EXCLUDED_CATEGORIES.includes(cat));
    const hasIncluded = categories.some(cat => INCLUDED_CATEGORIES.includes(cat));

    // If it has excluded categories, skip it.
    // If it doesn't have any included categories, we skip it to "avoid limits" as requested.
    if (hasExcluded || (!hasIncluded && categories.length > 0)) {
      console.log(`Skipping (Category): ${item.title} [${categories.join(', ')}]`);
      continue;
    }

    // Special case: if there are no categories at all, we might want to check it anyway,
    // but the instruction suggests using labels to filter.
    // To be safe and avoid limits, we skip if no categories match our whitelist.
    if (categories.length === 0) {
      console.log(`Skipping (No categories): ${item.title}`);
      continue;
    }

    console.log(`Analyzing: ${item.title}`);

    let articleContent = await fetchFullArticle(item.link || '');
    let isFromSummary = false;

    if (!articleContent) {
      console.log(`Could not fetch full content for "${item.title}", falling back to summary.`);
      articleContent = item.contentSnippet || '';
      isFromSummary = true;
    } else {
      console.log(`Fetched full content for "${item.title}" (${articleContent.length} characters)`);
    }

    const analysis = await analyzeArticle(item.title || '', articleContent);

    await new Promise(resolve => setTimeout(resolve, 4000));

    if (analysis && analysis.isPolicyRelated) {
      console.log(`Adding policy-related article: ${item.title}`);
      const newItem: NewsItem = {
        id,
        sourceUrl: item.link || '',
        title: {
          fi: item.title || '',
          en: analysis.titleEn || item.title || '',
        },
        originalSummary: item.contentSnippet || '',
        originalStatement: {
          fi: analysis.originalStatementFi || '',
          en: analysis.originalStatementEn || '',
        },
        analysis: {
          fi: analysis.analysisFi || '',
          en: analysis.analysisEn || '',
        },
        publishedAt: item.pubDate || new Date().toISOString(),
        category: analysis.category || 'General',
        isFromSummary,
      };

      existingData.unshift(newItem);

      // Sort by publishedAt date descending (newest first)
      existingData.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      // Save after each successful analysis to provide immediate feedback/persistence
      const finalData = existingData.slice(0, 50);
      await fs.writeFile(DATA_PATH, JSON.stringify(finalData, null, 2));
    } else if (analysis) {
      console.log(`Skipping non-policy article: ${item.title}`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
