import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  opinion: z.object({
    fi: z.string(),
    en: z.string(),
  }),
  publishedAt: z.string(),
  category: z.string(),
});

type NewsItem = z.infer<typeof NewsItemSchema>;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

async function analyzeArticle(title: string, summary: string) {
  const prompt = `
    You are an expert political analyst. I will provide you with a news headline and summary from Yle (Finnish national broadcaster).

    Article Title: ${title}
    Article Summary: ${summary}

    Tasks:
    1. Determine if this article is about political policy choices, legislative changes, government decisions (e.g., tax changes, social security reforms, new laws), or includes significant opinions/statements from politicians.
    2. If it IS policy-related or political, write a short "opinion column" style feedback.
       - It should be in both Finnish and English.
       - It should discuss the political implications, and potential positives and negatives of the choice/policy/opinion.
       - Focus specifically on what politicians are saying or what the policy impact will be.
       - Keep it concise but insightful (essay form, but short).
    3. Translate the original title to English if it is in Finnish.

    Respond ONLY in the following JSON format:
    {
      "isPolicyRelated": boolean,
      "titleEn": "Translated Title",
      "opinionFi": "Finnish opinion column",
      "opinionEn": "English opinion column",
      "category": "e.g. Economics, Social Policy, Environment"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
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
    const analysis = await analyzeArticle(item.title || '', item.contentSnippet || '');

    await new Promise(resolve => setTimeout(resolve, 4000));

    if (analysis && analysis.isPolicyRelated) {
      const newItem: NewsItem = {
        id,
        sourceUrl: item.link || '',
        title: {
          fi: item.title || '',
          en: analysis.titleEn || item.title || '',
        },
        originalSummary: item.contentSnippet || '',
        opinion: {
          fi: analysis.opinionFi || '',
          en: analysis.opinionEn || '',
        },
        publishedAt: item.pubDate || new Date().toISOString(),
        category: analysis.category || 'General',
      };

      existingData.unshift(newItem);
    }
  }

  const finalData = existingData.slice(0, 50);
  await fs.writeFile(DATA_PATH, JSON.stringify(finalData, null, 2));
  console.log('Done!');
}

main().catch(console.error);
