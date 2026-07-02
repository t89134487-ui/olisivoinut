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
        <For each={(newsData as any[]).slice(0, 20)} fallback={
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
                  {new Date(item.publishedAt).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' })}
                </time>
                {item.isFromSummary && (
                  <span class="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded border border-amber-200">
                    {t("from_summary")}
                  </span>
                )}
                {item.model && (
                  <span class="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded border border-gray-200">
                    {item.model}
                  </span>
                )}
              </div>

              <h2 class="text-3xl font-bold mb-6">
                {locale() === 'fi' ? item.title.fi : item.title.en}
              </h2>

              <div>
                <div class="whitespace-pre-wrap leading-relaxed text-gray-800 space-y-4">
                  {locale() === 'fi' ? item.analysis.fi : item.analysis.en}
                </div>
                <div class="mt-8 pt-4 border-t border-gray-100 text-right">
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
