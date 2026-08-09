import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

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

  const anthropic = new Anthropic({ apiKey });
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

    // Narrower AI pass per section to rename hashed CSS classes
    for (const section of parsedSections) {
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
        console.warn(`Class rename AI pass failed for section ${section.name}:`, err);
      }
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

  // Search for semantic containers or top-level main children
  const topContainers = $('header, nav, section, footer, main > div, body > div');

  topContainers.each((_, el) => {
    const tagName = el.tagName.toLowerCase();
    const classAttr = $(el).attr('class') || '';
    const idAttr = $(el).attr('id') || '';

    let name = 'Section';
    if (tagName === 'header' || tagName === 'nav' || classAttr.includes('nav') || classAttr.includes('header')) {
      name = 'Navbar';
    } else if (tagName === 'footer' || classAttr.includes('footer')) {
      name = 'Footer';
    } else if (index === 1 || classAttr.includes('hero')) {
      name = 'Hero';
    } else if (classAttr.includes('feature')) {
      name = 'Features';
    } else if (classAttr.includes('pricing')) {
      name = 'Pricing';
    } else {
      name = `Section ${index}`;
    }

    const selector = idAttr ? `#${idAttr}` : classAttr ? `.${classAttr.split(/\s+/)[0]}` : `${tagName}:nth-of-type(${index})`;

    sections.push({
      id: `section-${index}`,
      name,
      selector,
      description: `Auto-detected ${name} element`,
      htmlContent: $(el).html() || '',
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
