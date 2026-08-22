import { chromium } from 'playwright';
import path from 'path';

async function verifyClearance() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  
  const presentationPath = 'file:///' + path.resolve('presentation-deck/index.html').replace(/\\/g, '/');
  await page.goto(presentationPath, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Go to Slide 4 (which the user showed)
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'presentation-deck/assets/slide-4-clearance.png' });
  console.log('Saved slide-4-clearance.png');

  await browser.close();
}

verifyClearance();
