import { For } from "solid-js";
import { I18nProvider, useI18n } from "./i18n/context";
import newsData from "./data/news.json";
import "./App.css";

function Content() {
  const { t, locale, setLocale } = useI18n();

  const toggleLocale = () => {
    setLocale(locale() === "en" ? "fi" : "en");
  };

  return (
    <main class="max-w-4xl mx-auto p-4 md:p-8">
      <header class="flex justify-between items-center mb-12 border-b pb-6">
        <div>
          <h1 class="text-4xl font-bold text-gray-900">{t("title")}</h1>
          <p class="text-xl text-gray-600 mt-2">{t("subtitle")}</p>
        </div>
        <button
          onClick={toggleLocale}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {t("language")}: {locale().toUpperCase()}
        </button>
      </header>

      <div class="space-y-12">
        <For each={newsData as any[]} fallback={
          <div class="text-center py-20 bg-gray-50 rounded-lg">
            <p class="text-xl text-gray-500">{t("no_news")}</p>
          </div>
        }>
          {(item) => (
            <article class="prose prose-lg max-w-none border-b pb-12 last:border-b-0">
              <div class="flex items-center gap-4 mb-4">
                <span class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {item.category}
                </span>
                <time class="text-sm text-gray-500">
                  {t("published_at")}: {new Date(item.publishedAt).toLocaleDateString(locale())}
                </time>
              </div>

              <h2 class="text-3xl font-bold mb-4">
                {locale() === 'fi' ? item.title.fi : item.title.en}
              </h2>

              <div class="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500 mb-6 italic text-gray-700">
                {item.originalSummary}
                <div class="mt-4">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:underline text-sm font-semibold"
                  >
                    {t("read_more")} →
                  </a>
                </div>
              </div>

              <div class="whitespace-pre-wrap leading-relaxed text-gray-800 first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left">
                {locale() === 'fi' ? item.opinion.fi : item.opinion.en}
              </div>
            </article>
          )}
        </For>
      </div>
    </main>
  );
}

function App() {
  return (
    <I18nProvider>
      <Content />
    </I18nProvider>
  );
}

export default App;
