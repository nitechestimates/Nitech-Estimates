import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";

// Increase max duration for Vercel as PDF generation can take a few seconds
export const maxDuration = 60; 

export async function POST(req) {
  try {
    const { estimateId, estimateData } = await req.json();

    const data = estimateData || {}; 
    const nameOfWork = data.nameOfWork || "Unknown Work";
    const isTribal = data.isTribal || false;
    const rows = data.rows || [];
    
    // Extract lead settings passed from the frontend
    const leadSettings = data.leadSettings || {};
    const leadCategories = Object.keys(leadSettings);

    // MAHARASHTRA PWD / ZP HTML TEMPLATE
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; margin: 0; padding: 0; color: #000; }
          .page-break { page-break-before: always; }
          h1, h2, h3, h4 { text-align: center; margin: 4px 0; font-weight: bold; }
          .header { margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .sub-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; font-weight: bold; }
          
          /* Table Layout Fixes for Long Text */
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; table-layout: auto; }
          th, td { border: 1px solid #000; padding: 6px; text-align: center; vertical-align: top; }
          th { background-color: #f2f2f2; }
          
          /* Force description column to wrap text properly */
          .text-left { text-align: left; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; }
          .bold { font-weight: bold; }
          .tribal-badge { border: 1px solid #000; padding: 2px 6px; float: right; font-size: 10px; }
        </style>
      </head>
      <body>

        <div class="header">
          <h2>GOVERNMENT OF MAHARASHTRA</h2>
          <h3>PUBLIC WORKS DEPARTMENT / ZILLA PARISHAD</h3>
          <h1>GENERAL ABSTRACT</h1>
          ${isTribal ? '<div class="tribal-badge">TRIBAL AREA</div>' : ''}
        </div>
        <div class="sub-header">
          <span>Name of Work: ${nameOfWork}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th width="5%">Sr No.</th>
              <th width="45%">Description of Work</th>
              <th width="10%">Quantity</th>
              <th width="15%">Estimated Rate (Rs)</th>
              <th width="10%">Unit</th>
              <th width="15%">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="text-left">${r.description || r.ssr}</td>
                <td>--</td> 
                <td>${(r.netTotal || 0).toFixed(2)}</td>
                <td>${r.unit || 'No.'}</td>
                <td>--</td> 
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <div class="header">
          <h2>MEASUREMENT SHEET</h2>
        </div>
        <div class="sub-header">
          <span>Name of Work: ${nameOfWork}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th width="5%">Item No.</th>
              <th width="40%">Description</th>
              <th width="10%">No.</th>
              <th width="10%">L</th>
              <th width="10%">B</th>
              <th width="10%">D/H</th>
              <th width="15%">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="text-left"><strong>${r.ssr}</strong> - ${r.description || ''}</td>
                <td>1</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td class="bold">-</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <div class="header">
          <h2>RATE ANALYSIS</h2>
        </div>
        <div class="sub-header">
          <span>Name of Work: ${nameOfWork}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th width="5%">Item No.</th>
              <th width="35%">Description / SSR Code</th>
              <th width="10%">Basic Rate</th>
              <th width="15%">Material Lead</th>
              <th width="10%">Deduct</th>
              <th width="10%">Tribal (10%)</th>
              <th width="15%">Net Rate (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="text-left"><strong>${r.ssr}</strong><br/>${r.description || ''}</td>
                <td>${(r.basicRate || 0).toFixed(2)}</td>
                <td>${(r.totalLead || 0).toFixed(2)}</td>
                <td>${(r.deduct || 0).toFixed(2)}</td>
                <td>${(r.tribal || 0).toFixed(2)}</td>
                <td class="bold">${(r.netTotal || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <div class="header">
          <h2>MATERIAL LEAD STATEMENT</h2>
        </div>
        <div class="sub-header">
          <span>Name of Work: ${nameOfWork}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th width="10%">Sr No.</th>
              <th width="50%">Material Category</th>
              <th width="20%">Distance (Km)</th>
              <th width="20%">Lead Charge (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${leadCategories.length > 0 ? leadCategories.map((cat, i) => {
              const setting = leadSettings[cat] || {};
              const dist = setting.distance !== undefined ? setting.distance : setting.leadDistance;
              const charge = setting.leadCharge;
              
              // Formatting logic: show NA if value is 0, blank, null, or undefined
              const displayDist = (!dist || dist === 0 || dist === "0") ? "NA" : Number(dist).toFixed(2);
              const displayCharge = (!charge || charge === 0 || charge === "0") ? "NA" : Number(charge).toFixed(2);
              
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td class="text-left">${cat}</td>
                  <td class="${displayDist === 'NA' ? 'bold' : ''}">${displayDist}</td>
                  <td class="${displayCharge === 'NA' ? 'bold' : ''}">${displayCharge}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="4">No lead data configured for this estimate.</td></tr>`}
          </tbody>
        </table>

      </body>
      </html>
    `;

    const isLocal = process.env.NODE_ENV === "development";
    
    // Auto-detect local browser path by checking common installation folders
    const getLocalBrowserPath = () => {
      if (process.platform === 'win32') {
        const paths = [
          'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
          'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
          `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ];
        for (const p of paths) {
          if (fs.existsSync(p)) return p;
        }
      } else if (process.platform === 'darwin') { // Mac
        return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
      }
      return '/usr/bin/brave-browser'; // Linux
    };

    const browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: isLocal 
        ? (process.env.LOCAL_CHROME_PATH || getLocalBrowserPath()) 
        : await chromium.executablePath(),
      headless: isLocal ? "new" : chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
    });
    
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Estimate_${nameOfWork.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
}