import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  
  console.log('Capturing fresh screenshots from https://site-compiler.netlify.app/ ...');
  try {
    await page.goto('https://site-compiler.netlify.app/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Screenshot 1: Clean hero view
    await page.screenshot({ path: 'presentation-deck/assets/homepage-hero.png', clip: { x: 0, y: 0, width: 1200, height: 720 } });
    console.log('Saved presentation-deck/assets/homepage-hero.png');

    // Screenshot 2: Input / Export screen
    const input = await page.$('input[type="text"], input[type="url"], input');
    if (input) {
      await input.fill('https://example.com');
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: 'presentation-deck/assets/url-input-state.png', clip: { x: 0, y: 0, width: 1200, height: 680 } });
    console.log('Saved presentation-deck/assets/url-input-state.png');

  } catch (err) {
    console.error('Error capturing:', err);
  } finally {
    await browser.close();
  }
}

capture();
