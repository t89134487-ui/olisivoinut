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
const SKIPPED_PATH = path.join(process.cwd(), 'src/data/skipped.json');

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
  model: z.string(),
});

type NewsItem = z.infer<typeof NewsItemSchema>;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

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

async function analyzeArticle(title: string, content: string, modelName: string) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert political analyst. I will provide you with a news headline and the full content (or summary) of an article from Yle (Finnish national broadcaster).

    Article Title: ${title}
    Article Content: ${content}

    Tasks:
    1. Determine if this article is about political policy choices, legislative changes, government decisions (e.g., tax changes, social security reforms, new laws), or includes significant opinions/statements from politicians.
    2. SCOPE REQUIREMENTS:
       - INCLUDE domestic Finnish politics.
       - INCLUDE EU (Brussels) politics ONLY IF it concerns general EU rules/proposals that apply to all member states or Finland specifically.
       - INCLUDE Finnish political actions, budget changes, or major statements regarding international affairs (e.g., a Finnish minister commenting on a foreign conflict).
       - EXCLUDE news specific to other EU member states (e.g., "France changes its labor law") even if the EU Commission is involved, unless it affects Finland or all member states directly.
       - EXCLUDE general worldwide news, international conflicts, or market trends UNLESS there is a specific Finnish political response, policy change, or significant statement from a Finnish politician included.
       - EXCLUDE news about sending aid (military or foreign) UNLESS it describes a change in Finnish policy, budget, or includes political commentary on the decision.
    3. IGNORE articles that are general overviews of current events, daily summaries, morning roundups, or lists of news from different regions. Only focus on specific policy proposals, legislative actions, or major political statements that fit the scope above.
    4. POLICY FOCUS: Ignore all aspects regarding government stability, keeping the administration together, or maintaining political credibility. Focus strictly on the merits of the policy itself and what would be the best course of action from a policy perspective.
    5. If it IS policy-related or political AND within scope, provide an extensive summary and analysis in both Finnish and English.
    6. The analysis MUST follow this structure in a single cohesive text:
       - First, provide a comprehensive summary of the article's content, arguments, and key points so the reader understands everything without clicking the source link.
       - Second, present your own independent analytical vision of the actions that should be taken in response to the situation described.
       - Do NOT use labels like "Argument:" or "Criticism:". It should read as a single, well-structured flow of text.
       - IMPORTANT: Your vision must be your own independent analytical opinion focused strictly on the specific policy or situation discussed in the article. If you believe a proposal is flawed, explain why and how *that specific proposal* should be improved or handled. Do NOT suggest unrelated alternative policies or random different taxes/subsidies that are not the subject of the article (e.g., if the article is about a tax credit, do not suggest taxing something else instead).
    7. Translate the original title to English if it is in Finnish.

    Respond ONLY in the following JSON format:
    {
      "isPolicyRelated": boolean,
      "titleEn": "Translated Title",
      "analysisFi": "Extensive Finnish summary and policy vision (multi-paragraph)",
      "analysisEn": "Extensive English feedback/analysis (multi-paragraph)",
      "category": "e.g. Economics, Social Policy, Environment"
    }
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const parsed = JSON.parse(text);
  console.log(`Analysis result for "${title}": isPolicyRelated=${parsed.isPolicyRelated}`);
  return parsed;
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

  let skippedIdsList: string[] = [];
  try {
    const skippedContent = await fs.readFile(SKIPPED_PATH, 'utf-8');
    skippedIdsList = JSON.parse(skippedContent);
  } catch (e) {}

  const existingIds = new Set(existingData.map(item => item.id));
  const skippedIds = new Set(skippedIdsList);

  let currentModel = 'gemini-flash-latest';

  for (const item of [...feed.items].reverse()) {
    const id = item.guid || item.link || '';
    if (existingIds.has(id) || skippedIds.has(id)) continue;

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

    console.log(`Analyzing: ${item.title} using ${currentModel}`);

    let articleContent = await fetchFullArticle(item.link || '');
    let isFromSummary = false;

    if (!articleContent) {
      console.log(`Could not fetch full content for "${item.title}", falling back to summary.`);
      articleContent = item.contentSnippet || '';
      isFromSummary = true;
    } else {
      console.log(`Fetched full content for "${item.title}" (${articleContent.length} characters)`);
    }

    let analysis = null;
    try {
      analysis = await analyzeArticle(item.title || '', articleContent, currentModel);
    } catch (error) {
      if (currentModel === 'gemini-flash-latest') {
        console.warn(`Error with gemini-flash-latest, falling back to gemini-flash-lite-latest:`, error);
        currentModel = 'gemini-flash-lite-latest';
        try {
          analysis = await analyzeArticle(item.title || '', articleContent, currentModel);
        } catch (fallbackError) {
          console.error(`Error with fallback model gemini-flash-lite-latest:`, fallbackError);
        }
      } else {
        console.error(`Error with current model ${currentModel}:`, error);
      }
    }

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
          fi: '',
          en: '',
        },
        analysis: {
          fi: analysis.analysisFi || '',
          en: analysis.analysisEn || '',
        },
        publishedAt: item.pubDate || new Date().toISOString(),
        category: analysis.category || 'General',
        isFromSummary,
        model: currentModel,
      };

      existingData.unshift(newItem);

      // Save after each successful analysis to provide immediate feedback/persistence
      const finalData = existingData.slice(0, 50);
      await fs.writeFile(DATA_PATH, JSON.stringify(finalData, null, 2));
    } else if (analysis) {
      console.log(`Skipping non-policy or out-of-scope article: ${item.title}`);
      skippedIdsList.unshift(id);
      const finalSkipped = skippedIdsList.slice(0, 100);
      await fs.writeFile(SKIPPED_PATH, JSON.stringify(finalSkipped, null, 2));
    }
  }

  console.log('Done!');
}

main().catch(console.error);
