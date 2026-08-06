import * as fs from 'fs';
import * as path from 'path';
import { ExtractedAsset } from '../crawler/types';

export interface ProcessedAssetMap {
  [originalUrl: string]: string; // Maps original URL -> local relative path in output (e.g. ./assets/images/1_logo.png)
}

export function processAssets(
  rawDir: string,
  outputDir: string
): ProcessedAssetMap {
  const assetsManifestPath = path.join(rawDir, 'assets_manifest.json');
  const assetMap: ProcessedAssetMap = {};

  if (!fs.existsSync(assetsManifestPath)) {
    return assetMap;
  }

  const manifest: ExtractedAsset[] = JSON.parse(fs.readFileSync(assetsManifestPath, 'utf-8'));
  const outputAssetsDir = path.join(outputDir, 'assets');

  manifest.forEach((asset) => {
    const rawAssetFullPath = path.join(rawDir, asset.localPath);
    if (fs.existsSync(rawAssetFullPath)) {
      const catDir = path.join(/* turbopackIgnore: true */ outputAssetsDir, asset.category);
      fs.mkdirSync(catDir, { recursive: true });

      const destPath = path.join(/* turbopackIgnore: true */ catDir, asset.filename);
      fs.copyFileSync(rawAssetFullPath, destPath);

      // Relative path for HTML/CSS referencing
      const relPath = `./assets/${asset.category}/${asset.filename}`;
      assetMap[asset.originalUrl] = relPath;
    }
  });

  return assetMap;
}
