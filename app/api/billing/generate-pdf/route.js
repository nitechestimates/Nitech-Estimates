import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

export const maxDuration = 60;

export async function POST(req) {
  let browser;
  try {
    // 🔐 Auth check – user must be logged in to generate billing PDFs
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billingData, estimateData } = await req.json();
    const bData = billingData || {};
    const eData = estimateData || {};
    
    const extra = bData.extraBillingData || {};
    const nameOfWork = extra.nameOfWork || eData.nameOfWork || "Unknown Work";
    const headDivision = extra.headDivision || eData.headDivision || "";
    const subDivision = extra.subDivision || eData.subDivision || "";
    const yojana = extra.yojana || eData.yojana || "";
    const year = extra.year || eData.year || "";
    const estAmount = extra.estAmount || eData.estAmount || "0";
    const adminApprovalNo = extra.adminApprovalNo || eData.adminApprovalNo || "";

    const measurementItems = bData.measurementItems || [];
    const abstractCustomData = bData.abstractCustomData || {};
    
    // For Excess & Saving comparison:
    const originalMeasurementItems = bData.originalMeasurementItems || eData.measurementItems || [];
    const msOrigMap = new Map(originalMeasurementItems.map(item => [item.id, item]));

    // Load ZP logo Base64
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "zp-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn("Could not load ZP logo:", err);
    }

    // Map billing measurements
    const msMap = new Map(measurementItems.map(item => [item.id, item]));

    // Process rows
    // Estimate original rows (Tender rows)
    const eRows = eData.rows || [];
    
    // Compute Abstract rows
    const abstractRows = eRows.map((raItem, idx) => {
      const msItem = msMap.get(raItem.id);
      const executedQty = msItem?.totalQty !== undefined ? msItem.totalQty : 0;
      
      const custom = abstractCustomData[raItem.id] || {};
      const useReducedRate = custom.useReducedRate || false;
      const reducedRateVal = custom.reducedRate !== undefined && custom.reducedRate !== "" ? parseFloat(custom.reducedRate) : null;
      
      // Let user override standard rate in billing abstract
      const baseEstimateRate = raItem.netTotal || raItem.netAfterDeduct || 0;
      const customBillingRate = custom.rate !== undefined && custom.rate !== "" ? parseFloat(custom.rate) : baseEstimateRate;
      
      const activeRate = useReducedRate && reducedRateVal !== null ? reducedRateVal : customBillingRate;
      const executedAmount = executedQty * activeRate;

      // Tender (Estimate) values
      const origMsItem = msOrigMap.get(raItem.id);
      const tenderQty = origMsItem?.totalQty || 0;
      const tenderRate = baseEstimateRate;
      const tenderAmount = tenderQty * tenderRate;
      
      return {
        id: raItem.id,
        srNo: idx + 1,
        ssr: raItem.ssr || "",
        description: raItem.description,
        specs: raItem.specs || "",
        unit: raItem.unit,
        isRoyalty: raItem.isRoyalty,
        // Tender
        tenderQty,
        tenderRate,
        tenderAmount,
        // Executed
        executedQty,
        executedRate: activeRate,
        executedAmount,
        useReducedRate,
        reducedRate: reducedRateVal,
        baseRate: customBillingRate,
      };
    });

    const standardRows = abstractRows.filter(r => !r.isRoyalty);
    const royaltyRows = abstractRows.filter(r => r.isRoyalty);

    // Totals for Executed (Cost of work proper)
    const executedStandardTotal = standardRows.reduce((sum, r) => sum + r.executedAmount, 0);
    const GST_RATE = 18;
    const gstAmount = (executedStandardTotal * GST_RATE) / 100;
    
    let insuranceRate = 0.5;
    if (eData.labourInsurance && !isNaN(parseFloat(eData.labourInsurance))) {
      insuranceRate = parseFloat(eData.labourInsurance);
    } else {
      insuranceRate = executedStandardTotal > 2500000 ? 1.0 : 0.5;
    }
    const insuranceAmount = (executedStandardTotal * insuranceRate) / 100;
    const executedSubtotal = executedStandardTotal + gstAmount + insuranceAmount;
    
    const executedRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.executedAmount, 0);
    const executedGrandTotal = executedSubtotal + executedRoyaltyTotal;

    // Totals for Tender (Cost of work proper)
    const tenderStandardTotal = standardRows.reduce((sum, r) => sum + r.tenderAmount, 0);
    const tenderGst = (tenderStandardTotal * GST_RATE) / 100;
    const tenderInsurance = (tenderStandardTotal * insuranceRate) / 100;
    const tenderSubtotal = tenderStandardTotal + tenderGst + tenderInsurance;
    const tenderRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.tenderAmount, 0);
    const tenderGrandTotal = tenderSubtotal + tenderRoyaltyTotal;

    const formatMoney = (val) => (val || 0).toFixed(2);

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 15mm; }
          @page landscape { size: A4 landscape; margin: 15mm; }
          .landscape-page { page: landscape; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; margin: 0; line-height: 1.3; }
          .page-break { page-break-before: always; }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          
          .bill-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .bill-subtitle { text-align: center; font-size: 14px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
          
          /* Form 58A specifics */
          .form-container { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .form-container td { border: none; padding: 4px; vertical-align: top; }
          
          .border-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .border-table th, .border-table td { border: 1px solid #000; padding: 5px; vertical-align: middle; }
          .border-table th { font-weight: bold; text-align: center; background-color: #f3f4f6; }
          
          .signature-block { margin-top: 40px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
          .signature-block div { width: 33%; text-align: center; }
          
          .certificate-container { border: 2px solid #000; padding: 15px; margin-top: 20px; border-radius: 8px; }
          .cert-title { font-size: 14px; font-weight: bold; text-align: center; text-decoration: underline; margin-bottom: 15px; }
          
          .photo-frame { width: 90%; height: 350px; border: 3px dashed #777; margin: 20px auto; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #555; font-weight: bold; }
        </style>
      </head>
      <body>

        <!-- PAGE 1: Z.P. FORM NO. 58 (A) COVER -->
        <div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px; border-bottom:2px solid #000; padding-bottom:5px; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 40px; object-fit: contain;" />` : ""}
              <span>Z.P. Form No. 58 (A)</span>
            </div>
            <span>ZILLA PARISHAD, ${extra.dist?.toUpperCase() || "NASIK"} (${headDivision?.toUpperCase() || ""})</span>
          </div>
          
          <div style="display:flex; justify-content:space-between; margin-top:15px; font-weight:bold;">
            <div style="width:45%;">
              <div class="bill-title" style="text-align:left;">FINAL BILL</div>
              <div style="margin-top:10px; line-height:1.6; font-size:11px;">
                <strong>NOTE:</strong> For Contractor & Suppliers. This form provides only for payments for work or supplies actually measured.
                <ol style="padding-left:15px; margin-top:5px;">
                  <li>The full name of work as given in the estimate should be entered against "Name of work"</li>
                  <li>Purpose of supply applicable should be filled.</li>
                  <li>Outlay on the work should be recorded by subheads.</li>
                </ol>
              </div>
            </div>
            <div style="width:50%; border-left:1px solid #000; padding-left:15px; line-height:1.6;">
              <div>Panchayat Samitee: <u>${extra.taluka || "Niphad"}</u></div>
              <div style="border-top:1px solid #000; margin-top:5px; padding-top:5px;">
                Cash Book Voucher No: _____________ for the Month of ________________ 20___ (Year: ${year})
              </div>
              <div style="margin-top:10px;">
                <strong>NAME OF AGENCY:</strong> <span style="color:red; font-size:12px;">${extra.agencyName || "-"}</span><br/>
                <strong>Name of work:</strong> <span style="color:red;">${nameOfWork}</span><br/>
                <strong>Purpose of supply:</strong> <span>${extra.purposeOfSupply || "Work in Done"}</span><br/>
                <strong>Serial No of this Bill:</strong> <strong>${extra.serialNo || "I ST & Final Bill"}</strong><br/>
                <strong>Reference of Agreement:</strong> <span style="color:red;">${extra.agreementRef || "-"}</span> (AA No: ${adminApprovalNo})<br/>
                <strong>DATE:</strong> <span>${extra.date || ""}</span><br/>
                <strong>Commence Date:</strong> <span>${extra.commenceDate || "-"}</span><br/>
                <strong>Due Date:</strong> <span>${extra.dueDate || "-"}</span><br/>
                <strong>Extension Granted:</strong> <span>${extra.extensions || "NIL"}</span><br/>
                <strong>Actual Completion Date:</strong> <span>${extra.completionDate || "-"}</span>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; margin-top:20px; border-top:2px solid #000; padding-top:15px;">
            <div style="width:48%; border:1px solid #000; padding:10px; border-radius:6px;">
              <h4 style="margin:0 0 10px 0; text-align:center; text-decoration:underline;">Account Classification</h4>
              <table style="width:100%; font-size:10px;">
                <tr><td><strong>Major Head:</strong></td><td>${yojana ? "PLAN WORKS" : "NON PLAN WORKS"}</td></tr>
                <tr><td><strong>Minor Head:</strong></td><td>ORIGINAL WORKS / Communications</td></tr>
                <tr><td><strong>Sub-Head:</strong></td><td>Roads & Bridges / Buildings</td></tr>
                <tr><td><strong>Sanctioned Provision:</strong></td><td>Rs. ${formatMoney(parseFloat(estAmount))}</td></tr>
                <tr><td><strong>Expenditure incurred:</strong></td><td>Rs. ${formatMoney(executedGrandTotal)}</td></tr>
              </table>
            </div>
            <div style="width:48%; border:1px solid #000; padding:10px; border-radius:6px;">
              <h4 style="margin:0 0 10px 0; text-align:center; text-decoration:underline;">Security Deposit Details</h4>
              <table style="width:100%; font-size:10px; line-height:1.5;">
                <tr><td>1. SD to be recovered as per agreement:</td><td class="right bold">Rs. ${extra.sdAsPerAgreement || "0"}</td></tr>
                <tr><td>2. SD Previously recovered:</td><td class="right bold">Rs. ${extra.sdPreviouslyRecovered || "0"}</td></tr>
                <tr><td>3. SD to be Recovered from this bill:</td><td class="right bold" style="color:red;">Rs. ${extra.sdToBeRecovered || "0"}</td></tr>
                <tr><td>4. SD Balance to be recovered:</td><td class="right bold">Rs. ${extra.sdBalanceToRecover || "0"}</td></tr>
              </table>
            </div>
          </div>
          
          <div style="margin-top:50px; font-weight:bold; font-size:11px; display:flex; justify-content:space-between;">
            <div class="center">Sectional Engineer<br/>Z.P. Sub-Division ${subDivision}</div>
            <div class="center">Deputy Engineer<br/>Z.P. Sub-Division ${subDivision}</div>
          </div>
        </div>

        <!-- PAGE 2: ACCOUNT OF WORK EXECUTED (TABLE OF ITEMS) -->
        <div class="page-break"></div>
        <div class="bill-title">1. Account of work executed</div>
        <div style="font-weight:bold; margin-bottom:10px; font-size:10px;">NAME OF WORK: ${nameOfWork}</div>
        
        <table class="border-table" style="font-size:10px;">
          <thead>
            <tr>
              <th style="width:8%">Unit</th>
              <th style="width:12%">Quantity executed up to date</th>
              <th style="width:6%">Item No</th>
              <th style="width:44%">Items of Work supplies</th>
              <th style="width:10%">Rate</th>
              <th style="width:12%">Amount Rs.-Ps.</th>
              <th style="width:8%">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${standardRows.map((row) => `
              <tr>
                <td class="center">${row.unit || ""}</td>
                <td class="right font-semibold">${row.executedQty.toFixed(3)}</td>
                <td class="center font-bold">${row.srNo}</td>
                <td class="left">${row.description || ""}</td>
                <td class="right">
                  ${row.useReducedRate ? `
                    <div style="font-size:8px; text-decoration:line-through; color:#666;">${row.baseRate.toFixed(2)}</div>
                    <div style="font-size:8px; font-weight:bold; color:blue;">Reduced Rate</div>
                    <strong>${row.executedRate.toFixed(2)}</strong>
                  ` : `
                    ${row.executedRate.toFixed(2)}
                  `}
                </td>
                <td class="right bold">${row.executedAmount.toFixed(2)}</td>
                <td class="center">As per MB</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- PAGE 7 CONTINUATION OF ACCOUNT OF WORK EXECUTED -->
        <div class="page-break"></div>
        <div class="bill-title">1. Account of work executed (Contd.)</div>
        
        <table class="border-table" style="font-size:11px; margin-top:20px;">
          <tbody>
            <tr class="bold">
              <td colSpan="5" class="right">TOTAL (Cost of work proper):</td>
              <td class="right font-bold">${executedStandardTotal.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="4" class="right">Add For GST</td>
              <td class="center bold">18.00 %</td>
              <td class="right font-semibold">${gstAmount.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="4" class="right">Add Labour Insurance</td>
              <td class="center bold">${insuranceRate.toFixed(2)} %</td>
              <td class="right font-semibold">${insuranceAmount.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr class="bold bg-gray-100">
              <td colSpan="5" class="right">SUBTOTAL:</td>
              <td class="right font-bold">${executedSubtotal.toFixed(2)}</td>
              <td></td>
            </tr>
            
            ${royaltyRows.map((row) => `
              <tr style="background-color:#eff6ff;">
                <td class="center">${row.unit || ""}</td>
                <td class="right font-semibold">${row.executedQty.toFixed(3)}</td>
                <td class="center font-bold">${row.srNo}</td>
                <td class="left">${row.description || ""}</td>
                <td class="right">${row.executedRate.toFixed(2)}</td>
                <td class="right bold">${row.executedAmount.toFixed(2)}</td>
                <td class="center">As per MB</td>
              </tr>
            `).join("")}
            
            <tr class="bold bg-blue-50" style="font-size:12px;">
              <td colSpan="5" class="right uppercase">TOTAL VALUE OF WORK DONE OR SUPPLIES MADE TO DATE (A):</td>
              <td class="right font-black" style="color:red; font-size:13px;">${executedGrandTotal.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5" class="right">Limited to W.O.Amount:</td>
              <td class="right bold">${formatMoney(parseFloat(estAmount))}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5" class="right font-bold">Deduct value of work or supplies shown on previous bill:</td>
              <td class="right bold" style="color:purple;">- ${extra.deductPreviousBill || "0.00"}</td>
              <td></td>
            </tr>
            <tr class="bold bg-emerald-50" style="font-size:12px;">
              <td colSpan="5" class="right uppercase">NET VALUE WORK OR SUPPLIES SINCE PREVIOUS BILL (F):</td>
              <td class="right font-black" style="color:#059669; font-size:13px;">
                ${(executedGrandTotal - parseFloat(extra.deductPreviousBill || 0)).toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:20px; font-weight:bold; font-size:11px; border:1px solid #000; padding:10px; border-radius:6px;">
          II - Certificate and Signature:
          <p style="font-weight:normal; margin-top:5px; line-height:1.5;">
            The measurements are made by Shri. <strong>${extra.sectionalEngineerName || extra.jrEngineer || ""}</strong> Sectional Engineer on <u>${extra.certifiedDate || ""}</u> and are recorded at page _____________ to _____________ of Measurement Book No. _____________.
          </p>
        </div>

        <div class="signature-block" style="margin-top:50px;">
          <div>SECTIONAL ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
          <div>DEPUTY ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
          <div>EXECUTIVE ENGINEER<br/>Z.P. DIVISION ${extra.dist || "NASIK"}</div>
        </div>

        <!-- PAGE 3: FORM NO. 65 COMPLETION CERTIFICATE -->
        <div class="page-break"></div>
        <div class="certificate-container">
          <div class="bill-title">FORM NO. 65</div>
          <div class="bill-subtitle">(See Rule 190)</div>
          <div class="cert-title">COMPLETION CERTIFICATE OF ORIGINAL WORK, ZILLA PARISHAD NASHIK</div>
          
          <table style="width:100%; border:none; margin-top:20px; font-size:12px; line-height:1.8;">
            <tr><td style="width:25%;"><strong>NAME OF WORK:</strong></td><td style="color:red; font-weight:bold;">${nameOfWork}</td></tr>
            <tr><td><strong>NAME OF AGENCY:</strong></td><td style="font-weight:bold;">${extra.agencyName || "-"}</td></tr>
            <tr><td><strong>Authority:</strong></td><td>${extra.agreementRef || "-"}</td></tr>
          </table>

          <p style="margin-top:30px; font-size:13px; text-align:justify; line-height:1.6;">
            Certified that the work mentioned above was completed on <strong>${extra.completionDate || "_____________"}</strong> and that there have been not any material deviation from the sanctioned plan and specifications other than those sanctioned by competent authority.
          </p>

          <table style="width:100%; border:none; margin-top:35px; font-size:12px; font-weight:bold;">
            <tr><td style="width:40%;">Estimated Amount Rs:</td><td>Rs. ${formatMoney(parseFloat(estAmount))}</td></tr>
            <tr><td>Expenditure incurred Rs:</td><td>Rs. ${formatMoney(executedGrandTotal)}</td></tr>
          </table>

          <div style="margin-top:80px; font-weight:bold; font-size:11px; display:flex; justify-content:space-between;">
            <div class="center">SECTIONAL ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
            <div class="center">DEPUTY ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
          </div>
        </div>

        <!-- PAGE 4: NO RECOVERY & OBSERVATION CERTIFICATES -->
        <div class="page-break"></div>
        <div class="certificate-container">
          <div class="cert-title" style="font-size:15px; margin-bottom:10px;">NO RECOVERY CERTIFICATE</div>
          <table style="width:100%; font-size:11px; line-height:1.6; margin-bottom:15px;">
            <tr><td style="width:20%">NAME OF WORK:</td><td class="bold">${nameOfWork}</td></tr>
            <tr><td>Name of Agency:</td><td class="bold">${extra.agencyName || "-"}</td></tr>
            <tr><td>Authority:</td><td>${extra.agreementRef || "-"}</td></tr>
            <tr><td>DATE:</td><td>${extra.certifiedDate || ""}</td></tr>
          </table>
          <p style="font-size:12px; line-height:1.5;">
            Certified that there is not any recovery to be recovered from the contracting Agency against this bill for the work stated above. Hence recovery from this bill is <strong>N I L</strong>.
          </p>
          <div style="margin-top:20px; display:flex; justify-content:space-between; font-weight:bold;">
            <div>SECTIONAL ENGINEER</div>
            <div>DEPUTY ENGINEER</div>
          </div>
        </div>

        <div class="certificate-container" style="margin-top:30px;">
          <div class="cert-title" style="font-size:15px; margin-bottom:10px;">CERTIFICATE OF OBSERVATION MEMO</div>
          <table style="width:100%; font-size:11px; line-height:1.6; margin-bottom:15px;">
            <tr><td style="width:20%">NAME OF WORK:</td><td class="bold">${nameOfWork}</td></tr>
            <tr><td>Name of Agency:</td><td class="bold">${extra.agencyName || "-"}</td></tr>
            <tr><td>Authority:</td><td>${extra.agreementRef || "-"}</td></tr>
            <tr><td>DATE:</td><td>${extra.certifiedDate || ""}</td></tr>
          </table>
          <p style="font-size:12px; line-height:1.5;">
            This is to certify that there is not any observation memo regarding the work above by the Superintending Engr.P.W.Circle Nasik or Executive Engr, Z.P.(B.&.C.) Division No. 3 Zilla Parishad Nasik.
          </p>
          <div style="margin-top:20px; display:flex; justify-content:space-between; font-weight:bold;">
            <div>SECTIONAL ENGINEER</div>
            <div>DEPUTY ENGINEER</div>
          </div>
        </div>

        <!-- PAGE 5: WORK PHOTO -->
        <div class="page-break"></div>
        <div class="certificate-container" style="height:92vh;">
          <div class="bill-title" style="font-size:16px;">WORK PHOTO</div>
          <div style="font-weight:bold; font-size:11px; margin-top:10px;">NAME OF WORK: ${nameOfWork}</div>
          
          ${extra.workPhoto ? `
            <div style="width:90%; height:380px; margin:30px auto; border:2px solid #ccc; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
              <img src="${extra.workPhoto}" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </div>
          ` : `
            <div class="photo-frame">
              PLACE WORK PHOTOS HERE
            </div>
          `}

          <div style="margin-top:80px; font-weight:bold; font-size:11px; display:flex; justify-content:space-between;">
            <div class="center">SECTIONAL ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
            <div class="center">DEPUTY ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
          </div>
        </div>

        <!-- PAGE 6: EXCESS & SAVING STATEMENT (DYNAMIC COMPARISON) -->
        <div class="page-break landscape-page"></div>
        <div class="bill-title">EXCESS & SAVING STATEMENT</div>
        <div style="font-weight:bold; margin-bottom:10px; font-size:10px;">NAME OF WORK: ${nameOfWork}</div>
        
        <table class="border-table" style="font-size:9px;">
          <thead>
            <tr>
              <th rowspan="2" style="width:4%">Item No</th>
              <th rowspan="2" style="width:30%">Description of Item</th>
              <th colspan="3">TENDER QTY (As per Estimate)</th>
              <th colspan="3">EXECUTED QTY (As per Bill)</th>
              <th rowspan="2" style="width:10%">Excess / Saving Amount</th>
              <th rowspan="2" style="width:8%">Remarks</th>
            </tr>
            <tr>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${abstractRows.map((row) => {
              const diff = row.executedAmount - row.tenderAmount;
              const color = diff < 0 ? "green" : diff > 0 ? "red" : "black";
              return `
                <tr>
                  <td class="center font-bold">${row.srNo}</td>
                  <td class="left">${row.description || ""}</td>
                  <td class="right">${row.tenderQty.toFixed(3)}</td>
                  <td class="right">${row.tenderRate.toFixed(2)}</td>
                  <td class="right">${row.tenderAmount.toFixed(2)}</td>
                  <td class="right font-semibold">${row.executedQty.toFixed(3)}</td>
                  <td class="right">${row.executedRate.toFixed(2)}</td>
                  <td class="right font-semibold">${row.executedAmount.toFixed(2)}</td>
                  <td class="right bold" style="color:${color};">
                    ${diff === 0 ? "0.00" : (diff > 0 ? "+" : "") + diff.toFixed(2)}
                  </td>
                  <td class="center font-semibold" style="color:${color};">
                    ${diff === 0 ? "No Change" : (diff < 0 ? "Saving" : "Excess")}
                  </td>
                </tr>
              `;
            }).join("")}
            <tr class="bold bg-gray-150" style="font-size:10px;">
              <td colspan="2" class="right">GRAND TOTALS:</td>
              <td colspan="2"></td>
              <td class="right">${tenderGrandTotal.toFixed(2)}</td>
              <td colspan="2"></td>
              <td class="right">${executedGrandTotal.toFixed(2)}</td>
              <td class="right" style="color:${(executedGrandTotal - tenderGrandTotal) < 0 ? "green" : "red"};">
                ${(executedGrandTotal - tenderGrandTotal).toFixed(2)}
              </td>
              <td class="center">
                ${(executedGrandTotal - tenderGrandTotal) === 0 ? "No Change" : (executedGrandTotal - tenderGrandTotal) < 0 ? "Saving" : "Excess"}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="signature-block" style="margin-top:50px;">
          <div>SECTIONAL ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
          <div></div>
          <div>DEPUTY ENGINEER<br/>Z.P. SUB-DIVISION ${subDivision}</div>
        </div>

        <!-- PAGE 8: MEMORANDUM OF PAYMENTS -->
        <div class="page-break"></div>
        <div class="bill-title">III - MEMORANDUM OF PAYMENTS</div>
        
        <table class="border-table" style="font-size:11px; margin-top:20px; line-height:1.6;">
          <tbody>
            <tr>
              <td style="width:70%;">1. Total value of work done or supplies made as per Account-I, Col 5, Entry (A)</td>
              <td class="right bold">Rs. ${executedGrandTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>2. Deduct Amount Withheld</td>
              <td class="right">Rs. 0.00</td>
            </tr>
            <tr>
              <td>3. Balance, i.e. "Up-to-date" payments (Items 1 - 2)</td>
              <td class="right bold">Rs. ${executedGrandTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>4. Total amount of payments already made as per entry (K) of last Running Account Bill No. __________</td>
              <td class="right">Rs. ${extra.deductPreviousBill || "0.00"}</td>
            </tr>
            <tr class="bg-gray-100 font-bold" style="font-size:12px;">
              <td>5. Payments now to be made as detailed below: (Net value of this bill)</td>
              <td class="right font-black" style="color:red;">Rs. ${(executedGrandTotal - parseFloat(extra.deductPreviousBill || 0)).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:40px; font-size:12px; line-height:1.8;">
          Received Rs. _________________________________________________________________________________________ as per above memorandum.
          <br/><br/>
          Dated: ___________________
          <br/><br/>
          <div style="display:flex; justify-content:space-between; margin-top:20px;">
            <div>Witness: __________________________</div>
            <div style="border:1px solid #000; width:150px; height:60px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">
              Contractor Signature / Stamp
            </div>
          </div>
        </div>

        <div class="signature-block" style="margin-top:60px; font-size:11px;">
          <div>Paid by me vide Cheque No. ____________</div>
          <div>Cashier: ____________________</div>
          <div>Disbursing Officer: _______________</div>
        </div>

      </body>
      </html>
    `;

    // Launch Puppeteer
    const isLocal = process.env.NODE_ENV === "development";
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
      } else if (process.platform === 'darwin') {
        return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
      }
      return '/usr/bin/brave-browser';
    };

    browser = await puppeteer.launch({
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
      displayHeaderFooter: true,
      footerTemplate: '<div style="font-size:8px; text-align:center; width:100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: '10mm', bottom: '15mm', left: '10mm', right: '10mm' },
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bill_${nameOfWork.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    console.error("Billing PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate billing PDF" }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
