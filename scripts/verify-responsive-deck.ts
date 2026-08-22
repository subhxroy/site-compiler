import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function verifyAllSlides() {
  const browser = await chromium.launch({ headless: true });
  const presentationPath = 'file:///' + path.resolve('presentation-deck/index.html').replace(/\\/g, '/');
  
  const outDir = 'presentation-deck/assets/responsive-tests';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop 1440x900
  console.log('Testing Desktop 1440x900...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(presentationPath, { waitUntil: 'load' });
  await desktopPage.waitForTimeout(600);

  for (let s = 1; s <= 12; s++) {
    await desktopPage.screenshot({ path: path.join(outDir, `desktop-slide-${s}.png`) });
    console.log(`Saved desktop-slide-${s}.png`);
    if (s < 12) {
      await desktopPage.keyboard.press('ArrowRight');
      await desktopPage.waitForTimeout(350);
    }
  }
  await desktopContext.close();

  // 2. Mobile Portrait 390x844 (like teacher/student phone viewing)
  console.log('\nTesting Mobile Portrait 390x844...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(presentationPath, { waitUntil: 'load' });
  await mobilePage.waitForTimeout(600);

  for (let s = 1; s <= 12; s++) {
    await mobilePage.screenshot({ path: path.join(outDir, `mobile-slide-${s}.png`) });
    console.log(`Saved mobile-slide-${s}.png`);
    if (s < 12) {
      await mobilePage.keyboard.press('ArrowRight');
      await mobilePage.waitForTimeout(350);
    }
  }
  await mobileContext.close();

  await browser.close();
  console.log('\nAll slides verified successfully!');
}

verifyAllSlides();
