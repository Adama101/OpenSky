import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = dirname(fileURLToPath(import.meta.url));
const mdPath = join(here, 'OPENSKY-CORP.md');
const printHtmlPath = join(here, 'OPENSKY-CORP-print.html');
const pdfPath = join(here, 'OPENSKY-CORP.pdf');

// Regenerate HTML from Markdown (macOS textutil) so PDF matches the .md source.
import { execSync } from 'node:child_process';
execSync(
  `textutil -convert html -output "${printHtmlPath}" "${mdPath}"`,
  { stdio: 'inherit' },
);

const body = readFileSync(printHtmlPath, 'utf8');
const styled = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1a1a1a; max-width: 820px; margin: 2cm auto; }
  h1 { font-size: 20pt; border-bottom: 2px solid #111; padding-bottom: 0.25em; }
  h2 { font-size: 14pt; margin-top: 1.2em; page-break-after: avoid; }
  h3 { font-size: 12pt; margin-top: 0.9em; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 0.6em 0; }
  td, th { border: 1px solid #bbb; padding: 5px 8px; vertical-align: top; }
  th { background: #eee; }
  pre { font-size: 8pt; background: #f4f4f4; padding: 8px; white-space: pre-wrap; }
  blockquote { border-left: 4px solid #333; padding-left: 12px; color: #333; background: #f9f9f9; }
</style>
</head>
<body>
${body.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '')}
</body>
</html>`;

const renderPath = join(here, '.OPENSKY-CORP-render.html');
writeFileSync(renderPath, styled);

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage();
await page.goto(`file://${renderPath}`, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
});
await browser.close();
console.log(`Wrote ${pdfPath}`);
