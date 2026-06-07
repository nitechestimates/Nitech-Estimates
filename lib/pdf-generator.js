import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";
import os from "os";

// Concurrency Queue Settings
const queue = [];
let activeGenerations = 0;
const MAX_CONCURRENT_GENERATIONS = 3;

/**
 * Enqueue a generation task and process the queue.
 */
function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}

/**
 * Process next enqueued task if capacity allows.
 */
function processQueue() {
  if (activeGenerations >= MAX_CONCURRENT_GENERATIONS || queue.length === 0) {
    return;
  }

  activeGenerations++;
  const { fn, resolve, reject } = queue.shift();

  fn()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeGenerations--;
      processQueue();
    });
}

/**
 * Generates a PDF buffer from an HTML template using Puppeteer.
 * Automatically throttles concurrency using an in-memory queue.
 */
export async function generatePDF(htmlTemplate, pdfOptions = {}) {
  return enqueue(async () => {
    let browser;
    try {
      const isLocal = !process.env.VERCEL || process.platform !== 'linux' || process.env.NODE_ENV === "development";
      
      const getLocalBrowserPath = () => {
        if (process.platform === 'win32') {
          const userProfile = process.env.USERPROFILE || os.homedir();
          const paths = [
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            path.join(userProfile, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
          ];
          for (const p of paths) {
            if (fs.existsSync(p)) return p;
          }
        } else if (process.platform === 'darwin') {
          return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
        }
        return '/usr/bin/brave-browser';
      };

      const executablePath = isLocal
        ? (process.env.LOCAL_CHROME_PATH || getLocalBrowserPath())
        : await chromium.executablePath();

      browser = await puppeteer.launch({
        args: isLocal ? [] : chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: isLocal ? "new" : chromium.headless,
        ignoreHTTPSErrors: true,
      });

      const page = await browser.newPage();
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

      const mergedOptions = {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        footerTemplate: '<div style="font-size:9px; text-align:center; width:100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
        margin: { top: '15mm', bottom: '20mm', left: '15mm', right: '15mm' },
        ...pdfOptions
      };

      const pdfBuffer = await page.pdf(mergedOptions);
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  });
}
