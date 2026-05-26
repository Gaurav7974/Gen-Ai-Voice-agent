import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(3000); // Wait for React hydration and layout stabilization

  const layout = await page.evaluate(() => {
    function getDetails(selector) {
      const el = document.querySelector(selector);
      if (!el) return { selector, exists: false };
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        selector,
        exists: true,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        },
        styles: {
          display: style.display,
          position: style.position,
          left: style.left,
          right: style.right,
          transform: style.transform,
          margin: style.margin,
          padding: style.padding,
          width: style.width,
          maxWidth: style.maxWidth,
          minWidth: style.minWidth,
          flexDirection: style.flexDirection,
          justifyContent: style.justifyContent,
          alignItems: style.alignItems,
          overflow: style.overflow
        }
      };
    }

    return {
      html: getDetails('html'),
      body: getDetails('body'),
      root: getDetails('#root'),
      appShell: getDetails('.app-shell'),
      nav: getDetails('.lp-nav'),
      hero: getDetails('#hero'),
      heroContent: getDetails('.hero-content'),
      heroHeading: getDetails('.hero-heading'),
      heroDashboard: getDetails('.hero-dashboard-section'),
      landingBody: getDetails('.lp-landing-body')
    };
  });

  fs.writeFileSync('layout_inspection.json', JSON.stringify(layout, null, 2));
  console.log('Inspection complete! Saved to layout_inspection.json');

  await browser.close();
}

run().catch(console.error);
