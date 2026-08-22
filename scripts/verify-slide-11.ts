import { chromium } from 'playwright';
import path from 'path';

async function verifySlide11() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  
  const presentationPath = 'file:///' + path.resolve('presentation-deck/index.html').replace(/\\/g, '/');
  await page.goto(presentationPath, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  // Jump to Slide 11
  await page.keyboard.press('End');
  await page.waitForTimeout(700);

  await page.screenshot({ path: 'presentation-deck/assets/slide-11-clickable.png' });
  console.log('Saved slide-11-clickable.png');

  await browser.close();
}

verifySlide11();
