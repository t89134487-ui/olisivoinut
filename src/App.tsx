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

  const handleButtonClick = () => {
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

  const handleMouseEnter = () => {
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
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
          <div class="absolute bottom-14 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-200">
            {t("scroll_to_top")}
            <div class="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
          </div>
        </Show>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={t("scroll_to_top")}
          class="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-600 border border-gray-200 dark:border-gray-700 shadow-lg w-12 h-12 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
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

function DarkModeToggle() {
  const [isDark, setIsDark] = createSignal(false);

  const applyDarkMode = (dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  onMount(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      applyDarkMode(true);
    } else if (saved === "light") {
      applyDarkMode(false);
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyDarkMode(systemDark);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        applyDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);
    onCleanup(() => mediaQuery.removeEventListener("change", handleSystemChange));
  });

  const toggleDarkMode = () => {
    const nextDark = !isDark();
    applyDarkMode(nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleDarkMode}
      aria-label="Toggle theme"
      class="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <Show
        when={isDark()}
        fallback={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m0 13.5V21m8.966-8.966h-2.25m-13.5 0h-2.25m15.364-6.364l-1.591 1.591M6.758 17.242l-1.591 1.591m12.728 0l-1.591-1.591M6.758 6.758L5.167 5.167M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
        </svg>
      </Show>
    </button>
  );
}

function Content() {
  const { t } = useI18n();

  return (
    <main class="max-w-4xl mx-auto p-4 md:p-8">
      <header class="flex justify-between items-center mb-12 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100">{t("title")}</h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 mt-2">{t("subtitle")}</p>
        </div>
        <DarkModeToggle />
      </header>

      <div class="space-y-12">
        <For each={(newsData as any[]).slice(0, 20)} fallback={
          <div class="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p class="text-xl text-gray-500 dark:text-gray-400">{t("no_news")}</p>
          </div>
        }>
          {(item) => (
            <article class="prose dark:prose-invert prose-lg max-w-none border-b border-gray-200 dark:border-gray-800 pb-12 last:border-b-0">
              <div class="flex items-center gap-4 mb-4">
                <span class="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-sm font-medium px-2.5 py-0.5 rounded border border-transparent dark:border-blue-800">
                  {item.category}
                </span>
                <time class="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.publishedAt).toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
                {item.isFromSummary && (
                  <span class="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    {t("from_summary")}
                  </span>
                )}
                {item.model && (
                  <span class="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-mono px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                    {item.model}
                  </span>
                )}
              </div>

              <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {item.title}
              </h2>

              <div>
                <div class="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200 space-y-4">
                  {item.analysis}
                </div>
                <div class="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-right">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold"
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
