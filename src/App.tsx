import { For, createSignal, onMount, onCleanup, Show } from "solid-js";
import { I18nProvider, useI18n } from "./i18n/context";
import newsData from "./data/news.json";
import "./App.css";

function ScrollToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = createSignal(false);
  const [tooltipVisible, setTooltipVisible] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;

  const handleScroll = () => {
    setVisible(window.scrollY > 300);
  };

  const handleDocumentClick = (e: Event) => {
    if (buttonRef && !buttonRef.contains(e.target as Node)) {
      if (tooltipVisible()) {
        setTooltipVisible(false);
      }
    }
  };

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleDocumentClick);

    onCleanup(() => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleDocumentClick);
    });
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTooltipVisible(false);
  };

  const handleButtonClick = (e: MouseEvent) => {
    scrollToTop();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!tooltipVisible()) {
      e.preventDefault();
      setTooltipVisible(true);
    } else {
      e.preventDefault();
      scrollToTop();
    }
  };

  const handleMouseEnter = (e: MouseEvent) => {
    setTooltipVisible(true);
  };

  const handleMouseLeave = (e: MouseEvent) => {
    setTooltipVisible(false);
  };

  return (
    <div
      class={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${
        visible()
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div class="relative">
        <Show when={tooltipVisible()}>
          <div class="absolute bottom-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-200">
            {t("scroll_to_top")}
            <div class="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </Show>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={t("scroll_to_top")}
          class="bg-white hover:bg-gray-100 text-gray-700 active:bg-gray-200 border border-gray-200 shadow-lg w-12 h-12 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Content() {
  const { t } = useI18n();

  return (
    <main class="max-w-4xl mx-auto p-4 md:p-8">
      <header class="flex justify-between items-center mb-12 border-b pb-6">
        <div>
          <h1 class="text-4xl font-bold text-gray-900">{t("title")}</h1>
          <p class="text-xl text-gray-600 mt-2">{t("subtitle")}</p>
        </div>
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
                  {new Date(item.publishedAt).toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' })}
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
                {item.title}
              </h2>

              <div>
                <div class="whitespace-pre-wrap leading-relaxed text-gray-800 space-y-4">
                  {item.analysis}
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
      <ScrollToTop />
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
