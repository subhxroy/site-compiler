export interface AnimationMeta {
  hasCssKeyframes: boolean;
  hasViewportScrollTrigger: boolean;
  detectedTransitions: string[];
}

export function detectAnimationPatterns(cssContent: string, htmlContent: string): AnimationMeta {
  const hasCssKeyframes = cssContent.includes('@keyframes');
  const hasViewportScrollTrigger =
    htmlContent.includes('data-framer-appear-id') ||
    htmlContent.includes('IntersectionObserver') ||
    htmlContent.includes('motion-') ||
    htmlContent.includes('[opacity:0]');

  const transitionMatches = cssContent.match(/transition:\s*([^;]+)/g) || [];
  const detectedTransitions = transitionMatches.map((t) => t.replace('transition:', '').trim());

  return {
    hasCssKeyframes,
    hasViewportScrollTrigger,
    detectedTransitions,
  };
}

export function wrapWithFramerMotion(jsxString: string): string {
  // Replace top-level container div with Framer Motion motion.div
  const commentHeader = `// TODO: verify animation timing (Reconstructed Framer Motion viewport trigger)\n`;
  const wrapped = jsxString.replace(
    /^<div([^>]*)>/,
    `<motion.div$1 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>`
  ).replace(/<\/div>$/, `</motion.div>`);

  return commentHeader + wrapped;
}
