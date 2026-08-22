import { chromium } from 'playwright';
import path from 'path';

async function verifySlides() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  
  const presentationPath = 'file:///' + path.resolve('presentation-deck/index.html').replace(/\\/g, '/');
  console.log('Loading presentation:', presentationPath);
  await page.goto(presentationPath, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Take screenshot of Slide 1
  await page.screenshot({ path: 'presentation-deck/assets/slide-1-updated.png' });
  console.log('Saved slide-1-updated.png');

  // Next slide (Slide 2)
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'presentation-deck/assets/slide-2-updated.png' });
  console.log('Saved slide-2-updated.png');

  await browser.close();
  console.log('Slide verification completed!');
}

verifySlides();
