import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

export interface DetectedSection {
  id: string;
  name: string; // Navbar, Hero, Features, Pricing, Footer, etc.
  selector: string; // CSS selector or DOM identifier
  description: string;
  classRenameMap?: Record<string, string>; // original Hashed class -> Semantic class
  htmlContent?: string;
}

export interface SectionDetectionResult {
  sections: DetectedSection[];
  globalClassRenameMap: Record<string, string>;
  aiLogsDir: string;
}

function trimDomForAi(html: string): string {
  const $ = cheerio.load(html);

  // Remove base64 data URLs
  $('[src^="data:"]').attr('src', 'data:image/...');
  $('[srcset]').removeAttr('srcset');

  // Truncate extremely long text nodes
  $('*').contents().filter((_, node) => node.type === 'text').each((_, node) => {
    if (node.data && node.data.length > 150) {
      node.data = node.data.substring(0, 150) + '...';
    }
  });

  return $('body').html() || html.substring(0, 15000);
}

function logAiResponse(aiLogsDir: string, filename: string, content: string) {
  try {
    fs.mkdirSync(aiLogsDir, { recursive: true });
    fs.writeFileSync(path.join(aiLogsDir, filename), content, 'utf-8');
  } catch (e) {
    console.error('Failed to write AI log:', e);
  }
}

async function runWithBoundedConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const p = (async () => {
      await fn(item);
    })();
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

export async function detectSections(
  jobId: string,
  cleanedHtml: string,
  desktopScreenshotPath?: string
): Promise<SectionDetectionResult> {
  const exportsDir = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'exports', jobId);
  const aiLogsDir = path.join(exportsDir, 'ai-logs');
  fs.mkdirSync(aiLogsDir, { recursive: true });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn(`[Job ${jobId}] ANTHROPIC_API_KEY not found in environment. Using fallback heuristic section detection.`);
    return fallbackSectionDetection(cleanedHtml, aiLogsDir);
  }

  const anthropic = new Anthropic({ apiKey, timeout: 15000, maxRetries: 2 });
  const trimmedHtml = trimDomForAi(cleanedHtml);

  // Prepare image block if screenshot exists
  let imageBlock: Anthropic.ImageBlockParam | null = null;
  if (desktopScreenshotPath && fs.existsSync(desktopScreenshotPath)) {
    try {
      const imgBuffer = fs.readFileSync(desktopScreenshotPath);
      const base64Image = imgBuffer.toString('base64');
      imageBlock = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64Image,
        },
      };
    } catch (e) {
      console.warn('Could not load desktop screenshot for AI prompt:', e);
    }
  }

  const systemPrompt = `You are an expert web UI engineer. Your task is to analyze the DOM structure and visual screenshot of a web page and segment it into top-level logical UI sections.
Return a valid JSON array of objects representing sections in document order.
Each section object MUST contain:
- "id": string (e.g. "section-1", "section-2")
- "name": string (Standard section name: "Navbar", "Hero", "Features", "Pricing", "Testimonials", "FAQ", "Footer", or custom descriptive name)
- "selector": string (The CSS selector or tag name that uniquely identifies this section container in the DOM, e.g. "header", "footer", "main > div:nth-child(1)")
- "description": string (One sentence summary of the section's purpose and contents)

Return ONLY JSON. Do not include markdown code block formatting or extra text.`;

  const userContent: Anthropic.ContentBlockParam[] = [
    {
      type: 'text',
      text: `Analyze this HTML structure (and screenshot if provided) to identify top-level UI sections:\n\n${trimmedHtml.substring(0, 50000)}`,
    },
  ];

  if (imageBlock) {
    userContent.unshift(imageBlock);
  }

  try {
    console.log(`[Job ${jobId}] Calling Claude API for section detection...`);
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : '';
    logAiResponse(aiLogsDir, '1_sections_raw.json', rawContent);

    let parsedSections: DetectedSection[] = [];
    try {
      const cleanedJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedSections = JSON.parse(cleanedJson);
    } catch (e) {
      console.error('Failed to parse AI sections JSON. Retrying with strict prompt...', e);
      // Retry once
      const retryMsg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [
          { role: 'user', content: userContent },
          { role: 'assistant', content: rawContent },
          { role: 'user', content: 'The output was not valid JSON. Please return valid JSON ONLY with no formatting or prose.' },
        ],
      });
      const retryContent = retryMsg.content[0].type === 'text' ? retryMsg.content[0].text : '';
      logAiResponse(aiLogsDir, '1_sections_retry.json', retryContent);
      const cleanedRetry = retryContent.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedSections = JSON.parse(cleanedRetry);
    }

    const globalClassRenameMap: Record<string, string> = {};

    // Bounded AI concurrency (max 3 concurrent calls) to prevent request bursts
    await runWithBoundedConcurrency(parsedSections, 3, async (section) => {
      try {
        const renamePrompt = `Given the section "${section.name}" with description "${section.description}", propose semantic CSS class names for any hashed/generated class names (e.g. ".css-2ff83b", ".framer-1234").
Return a JSON object mapping old class name (without leading dot) to new semantic class name (e.g. {"css-2ff83b": "hero-title"}).
Return ONLY valid JSON.`;

        const renameRes = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: renamePrompt }],
        });

        const renameText = renameRes.content[0].type === 'text' ? renameRes.content[0].text : '{}';
        logAiResponse(aiLogsDir, `rename_${section.id}.json`, renameText);

        const cleanRenameJson = renameText.replace(/```json/g, '').replace(/```/g, '').trim();
        const sectionMap: Record<string, string> = JSON.parse(cleanRenameJson);

        section.classRenameMap = sectionMap;
        Object.assign(globalClassRenameMap, sectionMap);
      } catch (err) {
        console.warn(`Class rename AI pass skipped for section ${section.name}:`, err);
      }
    });

    // ── Resolve + freeze each section's HTML NOW, against the same
    // cleanedHtml the model actually looked at, so generation never has to
    // re-run the (possibly ambiguous/hallucinated) selector against a
    // different HTML string later. This is the single point of truth for
    // "what content belongs to this section."
    const $verify = cheerio.load(cleanedHtml);
    const usedNodes = new Set<AnyNode>(); // track actual DOM node identity to avoid two sections claiming the same element
    let unresolvedCount = 0;

    for (const section of parsedSections) {
      let el = section.selector ? $verify(section.selector).first() : $verify();

      // Guard against a selector matching an element another section already claimed
      // (e.g. an overly-generic selector like "div" matching the same wrapper twice).
      if (el.length > 0) {
        if (usedNodes.has(el[0])) {
          el = $verify(); // treat as unresolved rather than let it silently duplicate content across sections
        } else {
          usedNodes.add(el[0]);
        }
      }

      if (el.length > 0) {
        section.htmlContent = $verify.html(el) || undefined;
      } else {
        unresolvedCount++;
        console.warn(
          `[Job ${jobId}] Section "${section.name}" selector "${section.selector}" did not match any element in the actual DOM — leaving unresolved instead of guessing.`
        );
        section.htmlContent = undefined;
      }
    }

    if (unresolvedCount > 0) {
      logAiResponse(
        aiLogsDir,
        '2_unresolved_sections.json',
        JSON.stringify(
          parsedSections.filter((s) => !s.htmlContent).map((s) => ({ id: s.id, name: s.name, selector: s.selector })),
          null,
          2
        )
      );
    }

    return {
      sections: parsedSections,
      globalClassRenameMap,
      aiLogsDir,
    };
  } catch (err) {
    console.error('Anthropic API call failed. Falling back to heuristic detection:', err);
    return fallbackSectionDetection(cleanedHtml, aiLogsDir);
  }
}

function fallbackSectionDetection(cleanedHtml: string, aiLogsDir: string): SectionDetectionResult {
  const $ = cheerio.load(cleanedHtml);
  const sections: DetectedSection[] = [];
  let index = 1;

  // 1. Check if explicit semantic HTML5 elements exist
  let topContainers = $('body > header, body > nav, body > main > section, body > section, body > footer');

  // 2. If modern SPA (Framer / Webflow) where sections are inside SSR variants or main divs
  if (topContainers.length <= 1) {
    // Try finding Framer top-level named frames or section blocks
    const framerNamedBlocks = $('[data-framer-name]:not([data-framer-name=""]):not(svg *)');
    const framerSections = framerNamedBlocks.filter((_, el) => {
      const parent = $(el).parent();
      const name = $(el).attr('data-framer-name') || '';
      return (
        parent.is('body') ||
        parent.hasClass('ssr-variant') ||
        parent.is('main') ||
        /^(Nav|Header|Hero|About|Projects|Work|Services|Features|Pricing|Testimonials|FAQ|Footer|Banner)/i.test(name)
      );
    });

    if (framerSections.length > 1) {
      topContainers = framerSections;
    } else {
      // Find top container with multiple child blocks
      const mainContainer = $('.ssr-variant, main, body > div:first-child').first();
      const directChildren = mainContainer.children(':not(script):not(style)');
      if (directChildren.length > 1) {
        topContainers = directChildren;
      } else {
        topContainers = $('header, nav, section, footer, main > div, body > div');
      }
    }
  }

  topContainers.each((_, el) => {
    const tagName = el.tagName.toLowerCase();
    const classAttr = $(el).attr('class') || '';
    const idAttr = $(el).attr('id') || '';
    const framerName = $(el).attr('data-framer-name') || '';
    const textContent = ($(el).text() || '').substring(0, 100).toLowerCase();

    let name = 'Section';
    if (framerName) {
      // Clean up Framer name (e.g. "Hero Section" -> "Hero", "Navigation Bar" -> "Navbar")
      name = framerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      if (/nav|header|menu/i.test(name)) name = 'Navbar';
      else if (/hero|intro|headline/i.test(name)) name = 'Hero';
      else if (/footer|bottom|copyright/i.test(name)) name = 'Footer';
      else if (/project|work|portfolio/i.test(name)) name = 'Projects';
      else if (/about|bio|experience/i.test(name)) name = 'About';
    } else if (tagName === 'header' || tagName === 'nav' || classAttr.includes('nav') || classAttr.includes('header') || /logo|menu|nav/i.test(textContent)) {
      name = 'Navbar';
    } else if (tagName === 'footer' || classAttr.includes('footer') || textContent.includes('©') || textContent.includes('copyright') || textContent.includes('all rights reserved')) {
      name = 'Footer';
    } else if (index === 1 || classAttr.includes('hero') || tagName === 'h1' || $(el).find('h1').length > 0) {
      name = 'Hero';
    } else if (classAttr.includes('feature')) {
      name = 'Features';
    } else if (classAttr.includes('pricing')) {
      name = 'Pricing';
    } else if (classAttr.includes('project') || classAttr.includes('work') || classAttr.includes('portfolio')) {
      name = 'Projects';
    } else {
      name = `Section${index}`;
    }

    const sectionId = `section-${index}`;
    $(el).attr('data-sitecompiler-section', name);

    const selector = idAttr
      ? `#${idAttr}`
      : `[data-sitecompiler-section="${name}"]`;

    sections.push({
      id: sectionId,
      name,
      selector,
      description: `Auto-detected ${name} element`,
      htmlContent: $.html(el) || '',
    });

    index++;
  });

  logAiResponse(aiLogsDir, 'fallback_sections.json', JSON.stringify(sections, null, 2));

  return {
    sections,
    globalClassRenameMap: {},
    aiLogsDir,
  };
}
