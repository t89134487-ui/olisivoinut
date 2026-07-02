
import { test, expect } from '@playwright/test';

test('verify ui changes', async ({ page }) => {
  await page.goto('http://localhost:5174/olisivoinut/');
  await page.waitForSelector('article');

  // Take a screenshot to verify the lack of labels
  await page.screenshot({ path: '/home/jules/verification/final_ui_check.png', fullPage: true });

  // Check that "Published at" or "Julkaistu" is NOT present in the text
  const content = await page.textContent('article');
  expect(content).not.toContain('Published at');
  expect(content).not.toContain('Julkaistu');
  expect(content).not.toContain('AI Model');
});
