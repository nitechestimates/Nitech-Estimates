import { escapeHtml } from "../escapeHtml";

export function getEstimateHtml({
  logoBase64,
  dist,
  headDivision,
  subDivision,
  nameOfWork,
  estAmount,
  adminApprovalNo,
  yojana,
  year,
  jrEngineer,
  deputyEngineer,
  totalAmount,
  GST_RATE,
  totalGST,
  LABOUR_INSURANCE_RATE,
  totalLabourInsurance,
  subTotalWithTax,
  grandTotal,
  standardRows,
  royaltyRows,
  measurementItems,
  leadCategories,
  leadSettings,
  isTribal,
  tribalPercent,
  rows
}) {
  // Escape user-supplied strings to prevent HTML injection
  dist = escapeHtml(dist);
  headDivision = escapeHtml(headDivision);
  subDivision = escapeHtml(subDivision);
  nameOfWork = escapeHtml(nameOfWork);
  adminApprovalNo = escapeHtml(adminApprovalNo);
  yojana = escapeHtml(yojana);
  year = escapeHtml(year);
  jrEngineer = escapeHtml(jrEngineer);
  deputyEngineer = escapeHtml(deputyEngineer);

  standardRows = (standardRows || []).map(r => ({
    ...r,
    description: escapeHtml(r.description),
    specs: escapeHtml(r.specs),
    unit: escapeHtml(r.unit),
  }));

  royaltyRows = (royaltyRows || []).map(r => ({
    ...r,
    description: escapeHtml(r.description),
    specs: escapeHtml(r.specs),
    unit: escapeHtml(r.unit),
  }));

  rows = (rows || []).map(r => ({
    ...r,
    description: escapeHtml(r.description),
    specs: escapeHtml(r.specs),
    unit: escapeHtml(r.unit),
    materials: (r.materials || []).map(m => ({
      ...m,
      name: escapeHtml(m.name),
    })),
  }));

  measurementItems = (measurementItems || []).map(item => ({
    ...item,
    description: escapeHtml(item.description),
    unit: escapeHtml(item.unit),
    measurements: (item.measurements || []).map(m => ({
      ...m,
      description: escapeHtml(m.description),
    })),
  }));

  const originalLeadSettings = leadSettings || {};
  leadSettings = {};
  for (const cat of Object.keys(originalLeadSettings)) {
    leadSettings[escapeHtml(cat)] = {
      ...originalLeadSettings[cat],
      leadCharge: originalLeadSettings[cat]?.leadCharge,
      distance: originalLeadSettings[cat]?.distance,
      leadDistance: originalLeadSettings[cat]?.leadDistance,
    };
  }
  leadCategories = (leadCategories || []).map(cat => escapeHtml(cat));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    @page landscape { size: A4 landscape; margin: 15mm; }
    .landscape-page { page: landscape; }
    body { font-family: 'Arial', sans-serif; font-size: 12px; color: #000; margin: 0; line-height: 1.3; }
    .page-break { page-break-before: always; }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    
    h1 { font-size: 20px; font-weight: bold; text-decoration: underline; margin: 20px 0; }
    h2 { font-size: 16px; font-weight: bold; margin: 10px 0; }
    h3 { font-size: 14px; font-weight: bold; margin: 8px 0; }
    h4 { font-size: 13px; font-weight: bold; margin: 6px 0; }
    
    .doc-title { text-align: center; font-size: 24px; font-weight: bold; text-decoration: underline; margin-bottom: 30px; letter-spacing: 1px; }
    .logo-box { width: 100px; height: 120px; border: 2px solid #000; margin: 0 auto 30px auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; }
    
    .front-details { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 40px; line-height: 1.8; }
    .front-details u { text-decoration: underline; }
    
    .work-name-table { width: 100%; border: none; margin-bottom: 30px; }
    .work-name-table td { border: none; padding: 2px; font-size: 14px; font-weight: bold; }
    
    .meta-table { width: 100%; border: none; font-size: 14px; font-weight: bold; margin-bottom: 30px; }
    .meta-table td { border: none; padding: 8px 2px; }
    
    .yojana-box { text-align: center; font-size: 14px; font-weight: bold; text-decoration: underline; margin: 20px 0 40px 0; }
    
    .table-container { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
    .table-container th, .table-container td { border: 1.5px solid #000; padding: 6px 4px; vertical-align: middle; }
    .table-container th { font-weight: bold; text-align: center; }
    
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
    .signature-block div { width: 33%; text-align: center; }
    
    .header-row { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 15px; font-size: 12px; }
  </style>
</head>
<body>

  <!-- PAGE 1: DETAILED ESTIMATE (FRONT PAGE) -->
  <div class="doc-title">DETAILED ESTIMATE</div>
  
  <div class="logo-box">
    ${logoBase64 ? `<img src="${logoBase64}" style="max-width: 90px; max-height: 110px; object-fit: contain;" />` : `
    <svg viewBox="0 0 100 100" width="80" height="80">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#000" stroke-width="2"/>
      <path d="M50 10 L50 90 M10 50 L90 50" stroke="#000" stroke-width="1"/>
      <text x="50" y="55" font-size="12" text-anchor="middle" font-weight="bold">Z P</text>
    </svg>
    `}
  </div>
  
  <div class="front-details uppercase">
    <u>ZILLHA PARISHAD ${dist || 'NASIK'}</u><br/>
    <u>(B.&.C.) DIVISION NO: ${headDivision || '-'}</u><br/>
    <u>SUB-DIVISION (B&C) ${subDivision || '-'}</u>
  </div>
  
  <table class="work-name-table">
    <tr>
      <td style="width: 15%; vertical-align: top;"><u>NAME OF<br/>WORK:</u></td>
      <td style="width: 85%; vertical-align: top;">${nameOfWork}</td>
    </tr>
  </table>
  
  <table class="meta-table">
    <tr>
      <td style="width: 15%;"><u>EST. COST</u></td>
      <td style="width: 35%;"><u>${Number(estAmount).toFixed(2)}</u></td>
      <td style="width: 50%;"><u>ONLY</u></td>
    </tr>
    <tr><td colspan="3"><br/><u>T.S.NO/DA</u><br/></td></tr>
    <tr><td colspan="3"><br/><u>A.A.NO/</u> ${adminApprovalNo}<br/></td></tr>
    <tr><td colspan="3"><br/><u>JOB NO.</u><br/></td></tr>
  </table>
  
  <div class="yojana-box">${yojana || '15 th fin comm ( G P LEVEL )'}<br/>${year}</div>
  
  <!-- PAGE 2: ESTIMATE -->
  <div class="page-break"></div>
  <div class="doc-title">ESTIMATE</div>
  
  <table class="meta-table" style="font-weight: normal; font-size: 13px;">
    <tr><td style="width:30%;">YEAR</td><td class="bold">${year}</td></tr>
    <tr><td>DIVISION</td><td class="bold uppercase">(B.&.C.) DIVISION NO: ${headDivision}</td></tr>
    <tr><td>SUBDIVISION</td><td class="bold uppercase">SUB-DIVISION (B&C) ${subDivision}</td></tr>
    <tr><td>SANCTIONED ESTIMATE NO</td><td></td></tr>
    <tr><td>FUND HEAD</td><td class="bold underline"><u>${yojana}</u></td></tr>
    <tr><td>MAJOR HEAD</td><td></td></tr>
    <tr><td>MINOR HEAD</td><td></td></tr>
    <tr><td>SERVICE HEAD</td><td></td></tr>
    <tr><td>DEPARTMENTAL HEAD</td><td></td></tr>
  </table>
  
  <p style="font-size: 13px; text-transform: uppercase; margin: 30px 0; line-height: 1.5; text-align: justify;">
    THIS ESTIMATE IS FRAMED IN THE OFFICE OF EXECUTIVE ENGINEER, Z.P.(B.&.C.) DIVISION ${dist || 'NASIK'}. 
    THE PROBABLE EXPENSES THAT WILL BE INCURRED ON THE WORK NAMED BELOW :-
  </p>
  
  <table class="work-name-table" style="font-size: 13px;">
    <tr>
      <td style="width: 25%; font-weight: bold;">NAME OF WORK:</td>
      <td style="width: 75%; font-weight: bold;">${nameOfWork}</td>
    </tr>
  </table>
  
  <div class="right bold" style="font-size: 14px; margin: 40px 0;">
    ESTIMATED COST Rs: &nbsp;&nbsp; ${Number(estAmount).toFixed(2)} &nbsp;&nbsp; ONLY
  </div>
  
  <p style="font-size: 13px;">TECHNICALY SANCTIONED UNDER<br/>NO</p><br/>
  <p style="font-size: 13px;">ADMINISTRATIVELY APPROVED UNDER<br/>NO</p><br/>
  
  <table class="meta-table" style="font-size: 12px; margin-top: 30px;">
    <tr>
      <td style="width: 30%;">ESTIMATE PREPARED BY</td>
      <td style="width: 35%;" class="bold uppercase">Engr.Shri. ${jrEngineer}</td>
      <td style="width: 35%;" class="bold">Sectional Engineer</td>
    </tr>
    <tr>
      <td>ESTIMATE CHECKED BY</td>
      <td class="bold uppercase">Engr.Shri. ${deputyEngineer}</td>
      <td class="bold">Deputy Engineer</td>
    </tr>
    <tr>
      <td colspan="3"><br/>CALL OR ATHORITY:-</td>
    </tr>
  </table>
  
  <div class="center bold" style="text-decoration: underline; margin-top: 30px; font-size: 14px;">GENERAL DISCRIPTION</div>
  <div class="center" style="margin-top: 20px; font-size: 13px;">AS PER SEPERATE SHEET ATTACHED</div>


  <!-- PAGE 3: RECAPULATION SHEET -->
  <div class="page-break"></div>
  <div class="header-row uppercase">
    <div style="width:15%">NAME OF WORK:</div>
    <div style="width:85%; font-weight:normal;">${nameOfWork}</div>
  </div>
  
  <div class="doc-title" style="margin: 20px 0;">RECAPULATION SHEET</div>
  
  <table class="table-container" style="font-size: 13px;">
    <thead>
      <tr>
        <th style="width:10%">Sr.No.</th>
        <th style="width:50%">DESCRIPTION</th>
        <th style="width:15%">% CONSIDERED</th>
        <th style="width:15%">AMOUNT Rs-Ps.</th>
        <th style="width:10%">REMARK.</th>
      </tr>
      <tr style="background:#f9f9f9;"><th class="center"></th><th class="center">2</th><th class="center">3</th><th class="center">4</th><th class="center">5</th></tr>
    </thead>
    <tbody>
      <tr><td class="center">1</td><td class="left">Cost of work proper</td><td class="center"></td><td class="right">${totalAmount.toFixed(2)}</td><td></td></tr>
      <tr><td class="center">2</td><td class="left">SQM and Contegencies (GST)</td><td class="center bold" style="color:red;">${GST_RATE}%</td><td class="right">${totalGST.toFixed(2)}</td><td></td></tr>
      <tr><td class="center">3</td><td class="left">Labour Insurance</td><td class="center bold" style="color:red;">${LABOUR_INSURANCE_RATE}%</td><td class="right">${totalLabourInsurance.toFixed(2)}</td><td></td></tr>
      <tr><td colspan="3" class="right bold" style="border-right:1px solid #000;">Total Rs-Ps</td><td class="right bold border-2">${grandTotal.toFixed(2)}</td><td></td></tr>
    </tbody>
  </table>
  
  <div class="right bold" style="font-size: 14px; margin-top: 20px;">say Rs. &nbsp;&nbsp;&nbsp;&nbsp; <span style="color:red; text-decoration:underline;">${Math.round(grandTotal)}.00</span></div>
  
  <div class="signature-block">
    <div>SECTIONAL ENGINEER<br/>Z.P.(B&C)SUB-DIVISION ${subDivision.toUpperCase()}</div>
    <div></div>
    <div>DEPUTY ENGINEER<br/>Z.P.(B&C)SUB-DIVISION ${subDivision.toUpperCase()}</div>
  </div>


  <!-- PAGE 4: ABSTRACT -->
  <div class="page-break"></div>
  <div class="header-row uppercase" style="font-size: 11px;">
    <div style="width:10%">NAME<br/>OF<br/>WORK:</div>
    <div style="width:90%; font-weight:normal;">${nameOfWork}</div>
  </div>
  
  <div class="doc-title" style="margin: 10px 0;">ABSTRACT</div>
  
  <table class="table-container">
    <thead>
      <tr>
        <th style="width:6%">Sr. No.</th>
        <th style="width:44%">DESCRIPTION OF ITEM</th>
        <th style="width:14%">SPECIFICATIONS</th>
        <th style="width:8%">QTY</th>
        <th style="width:8%">UNIT</th>
        <th style="width:9%">RATE<br/>Rs.-Ps.</th>
        <th style="width:11%">AMOUNT<br/>Rs.-PS.</th>
      </tr>
      <tr style="background:#f9f9f9;">
        <th class="center">1</th>
        <th class="center">2</th>
        <th class="center"></th>
        <th class="center">3</th>
        <th class="center">4</th>
        <th class="center">5</th>
        <th class="center">6</th>
      </tr>
    </thead>
    <tbody>
      ${standardRows.map((row, i) => `
        <tr>
          <td class="center">${i+1}</td>
          <td class="left">${row.description || ''}</td>
          <td class="left">${row.specs || ''}</td>
          <td class="right">${(row.qty || 0).toFixed(3)}</td>
          <td class="center">${row.unit || ''}</td>
          <td class="right" style="font-size: 10px; line-height: 1.2;">
            ${row.useReducedRate && row.reducedRate !== null ? `
              <span style="color: #777777; text-decoration: line-through; font-size: 9px;">${(row.basicRate || 0).toFixed(2)}</span>
              <div style="font-weight: bold; margin-top: 2px; color: #1e3a8a; font-size: 8px; line-height: 1.1;">Reduced Rate</div>
              <div style="font-weight: bold; color: #1e3a8a;">${(row.reducedRate || 0).toFixed(2)}</div>
            ` : `
              ${(row.rate || 0).toFixed(2)}
            `}
          </td>
          <td class="right bold">${(row.amount || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr>
        <td colspan="6" class="right bold">TOTAL (Cost of work proper):</td>
        <td class="right bold">${totalAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" class="right bold">Add For GST</td>
        <td class="center bold">${GST_RATE}.00 %</td>
        <td colspan="2"></td>
        <td class="right">${totalGST.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" class="right bold">Add Labour Insurance</td>
        <td class="center bold">${LABOUR_INSURANCE_RATE.toFixed(2)} %</td>
        <td colspan="2"></td>
        <td class="right">${totalLabourInsurance.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="6" class="right bold">TOTAL:</td>
        <td class="right bold">${subTotalWithTax.toFixed(2)}</td>
      </tr>
      
      ${royaltyRows.map((row) => `
        <tr style="background:#e0f2fe;">
          <td class="center">${row.srNo}</td>
          <td class="left">${row.description || ''}</td>
          <td class="left">${row.specs || ''}</td>
          <td class="right">${(row.qty || 0).toFixed(3)}</td>
          <td class="center">${row.unit || ''}</td>
          <td class="right" style="font-size: 10px; line-height: 1.2;">
            ${row.useReducedRate && row.reducedRate !== null ? `
              <span style="color: #777777; text-decoration: line-through; font-size: 9px;">${(row.basicRate || 0).toFixed(2)}</span>
              <div style="font-weight: bold; margin-top: 2px; color: #1e3a8a; font-size: 8px; line-height: 1.1;">Reduced Rate</div>
              <div style="font-weight: bold; color: #1e3a8a;">${(row.reducedRate || 0).toFixed(2)}</div>
            ` : `
              ${(row.rate || 0).toFixed(2)}
            `}
          </td>
          <td class="right bold">${(row.amount || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
      
      <tr>
        <td colspan="6" class="right bold" style="font-size:13px;">TOTAL RS. (Grand Total):</td>
        <td class="right bold" style="font-size:13px; background-color:#eff6ff;">${grandTotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="signature-block">
    <div>SECTIONAL ENGINEER<br/>Z.P.(B&C)SUB-DIVISION ${subDivision.toUpperCase()}</div>
    <div></div>
    <div>DEPUTY ENGINEER<br/>Z.P.(B&C)SUB-DIVISION ${subDivision.toUpperCase()}</div>
  </div>


  <!-- PAGE 5: MEASUREMENT -->
  <div class="page-break"></div>
  <div class="header-row uppercase" style="font-size: 11px;">
    <div style="width:15%">NAME OF WORK:</div>
    <div style="width:85%; font-weight:normal;">${nameOfWork}</div>
  </div>
  
  <div class="doc-title" style="margin: 10px 0;">MEASUREMENT</div>
  
  <table class="table-container" style="border: 2px solid #000;">
    <thead>
      <tr style="border-bottom: 2px solid #000;">
        <th style="width:5%">I. No.</th>
        <th style="width:45%">DESCRIPTION OF ITEM</th>
        <th style="width:8%">No.</th>
        <th style="width:8%">L.</th>
        <th style="width:8%">B/W</th>
        <th style="width:8%">H/D.</th>
        <th style="width:10%">TOTAL</th>
        <th style="width:8%">UNIT</th>
      </tr>
      <tr style="background:#f9f9f9;"><th class="center">1</th><th class="center">2</th><th class="center">3</th><th class="center">4</th><th class="center">5</th><th class="center">6</th><th class="center">7</th><th class="center">8</th></tr>
    </thead>
    <tbody>
      ${measurementItems.length === 0 ? `<tr><td colspan="8" class="center">No measurement data available</td></tr>` : 
        measurementItems.map((item, idx) => {
        const measurements = item.measurements || [];
        const totalQty = item.totalQty || 0;
        const usePercent = item.usePercent || false;
        const percentValue = item.percentValue !== undefined ? item.percentValue : 100;
        const rawSum = measurements.reduce((sum, m) => sum + (m.total || 0), 0);

        let footerRowsHtml = "";
        if (usePercent) {
          footerRowsHtml = `
            <tr>
              <td colspan="5"></td>
              <td class="center" style="color:red; font-weight:bold; font-size:11px;">TOTAL</td>
              <td class="center bold" style="border-top:1px solid #000; border-bottom:1px solid #000; font-size:11px;">${rawSum.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colspan="5"></td>
              <td class="center" style="color:purple; font-weight:bold; font-size:11px;">${percentValue}%</td>
              <td class="center bold" style="color:purple; border-bottom:1px solid #000; font-size:11px;">${totalQty.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colspan="5"></td>
              <td class="center font-bold" style="font-weight:bold; font-size:12px;">Total Qty.</td>
              <td class="center bold" style="border-top:2px solid #000; border-bottom:2px solid #000; font-size:12px; background-color:#eff6ff;">${totalQty.toFixed(2)}</td>
              <td class="center" style="color:#6b21a8; font-weight:bold; font-size:12px;">${item.unit || 'One'}</td>
            </tr>
          `;
        } else {
          footerRowsHtml = `
            <tr>
              <td colspan="5"></td>
              <td class="center" style="color:red; font-weight:bold;">TOTAL</td>
              <td class="center bold" style="border-top:2px solid #000; border-bottom:2px solid #000;">${totalQty.toFixed(2)}</td>
              <td class="center" style="color:#6b21a8; font-weight:bold;">${item.unit || 'One'}</td>
            </tr>
          `;
        }

        return `
          <tr>
            <td class="center bold" style="font-size:14px;">${idx + 1}</td>
            <td class="left" colspan="7">${item.description || ''}</td>
          </tr>
          ${measurements.map(meas => `
            <tr>
              <td></td>
              <td class="left pl-4">${meas.description || ''}</td>
              <td class="center" style="color:blue; font-weight:bold;">${meas.no !== undefined && meas.no !== '' ? meas.no : '-'}</td>
              <td class="center" style="color:red; font-weight:bold;">${meas.l !== undefined && meas.l !== '' ? meas.l : '-'}</td>
              <td class="center" style="color:red; font-weight:bold;">${meas.b !== undefined && meas.b !== '' ? meas.b : '-'}</td>
              <td class="center" style="color:red; font-weight:bold;">${meas.h !== undefined && meas.h !== '' ? meas.h : '-'}</td>
              <td class="center bold">${(meas.total || 0).toFixed(2)}</td>
              <td></td>
            </tr>
          `).join('')}
          ${footerRowsHtml}
        `;
      }).join('')}
    </tbody>
  </table>


  <!-- PAGE 6: MATERIAL LEAD STATEMENT -->
  <div class="page-break"></div>
  <div class="doc-title" style="margin: 20px 0;">LEAD CHARGES STATEMENT</div>
  <div class="header-row" style="margin-bottom: 20px;">
    <div style="width:15%"><u>Name Of Work -</u></div>
    <div style="width:85%; color:red; text-transform:uppercase;">${nameOfWork}</div>
  </div>
  
  <table class="table-container" style="border: 2px solid #000; font-size: 13px;">
    <thead>
      <tr>
        <th style="width:50%; font-size:16px;">Type of Material</th>
        <th style="width:15%">Lead In<br/>Km s</th>
        <th style="width:15%">Lead<br/>Charges<br/>Rs.</th>
        <th style="width:20%">SOURCE</th>
      </tr>
    </thead>
    <tbody>
      ${leadCategories.length === 0 ? '<tr><td colspan="4" class="text-center">No lead data available</td></tr>' : 
        leadCategories.map((cat) => {
          const setting = leadSettings[cat] || {};
          const distance = setting.distance !== undefined ? setting.distance : (setting.leadDistance || 0);
          const charge = setting.leadCharge || 0;
          return `
            <tr>
              <td class="left bold">${cat}</td>
              <td class="center bold" style="color:red;">${distance === 0 ? '0.00' : distance.toFixed(2)}</td>
              <td class="center bold">${charge === 0 ? '#N/A' : charge.toFixed(2)}</td>
              <td class="center bold" style="color:red;">${distance === 0 ? 'Local' : `${distance.toFixed(2)} Km`}</td>
            </tr>
          `;
        }).join('')
      }
    </tbody>
  </table>
  
  <div class="signature-block" style="margin-top:80px;">
    <div>SECTIONAL ENGINEER<br/><span style="color:red;">Z.P.(B&C)SUB-DIVISION ${subDivision.toUpperCase()}</span></div>
    <div></div>
    <div>DEPUTY ENGINEER<br/><span style="color:red;">Z.P.(B&C)SUB-DIVISION ${subDivision.toUpperCase()}</span></div>
  </div>


  <!-- PAGE 7: RATE ANALYSIS -->
  <div class="page-break landscape-page">
    <div class="header-row" style="font-size: 11px;">
      <div style="width:10%">Name of<br/>work</div>
      <div style="width:90%; font-weight:normal;">${nameOfWork}</div>
    </div>
    
    <div class="doc-title" style="margin: 10px 0;">RATE ANALYSIS</div>
    
    <table class="table-container" style="font-size:10px;">
      <thead>
        <tr>
          <th style="width:3%">Sr.<br/>No.</th>
          <th style="width:4%">S.S.R.<br/>Item<br/>No.</th>
          <th style="width:43%">Description of the Item in Brief</th>
          <th style="width:3%">Unit</th>
          <th style="width:4%">Basic<br/>Rate<br/>(Rs.Ps.)</th>
          <th style="width:3%">deduct<br/>for<br/>scada</th>
          <th style="width:4%">Net<br/>amount<br/>after<br/>deductng</th>
          <th style="width:7%">Type of<br/>material<br/>requ- ired</th>
          <th style="width:3%">Qty of<br/>material<br/>reqd</th>
          <th style="width:4%; color:#3b82f6;">Net<br/>lead<br/>charges</th>
          <th style="width:4%">Total lead<br/>charges<br/>(Rs.Ps)</th>
          <th style="width:4%">Total (Rs.-<br/>Ps.)</th>
          <th style="width:4%">TRIBAL<br/>${isTribal ? tribalPercent : '0'}%</th>
          <th style="width:6%">Net Total<br/>Amount (Rs.<br/>Ps.)</th>
          <th style="width:4%">specificati<br/>ons</th>
        </tr>
      <tr style="background:#f9f9f9;">
        <th class="center">1</th><th class="center">2</th><th class="center">3</th><th class="center">4</th>
        <th class="center">5</th><th class="center">6</th><th class="center">7</th><th class="center">8</th>
        <th class="center">9</th><th class="center">10</th><th class="center">11</th><th class="center">12</th>
        <th class="center">13</th><th class="center">14</th><th class="center">15</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, i) => {
        const materialsHtml = (row.materials || []).map(mat => `<div style="border-bottom:1px dotted #ccc; padding:2px 0;">${mat.name || ''}</div>`).join('');
        const qtyHtml = (row.materials || []).map(mat => `<div style="border-bottom:1px dotted #ccc; padding:2px 0;">${(mat.qty || 0).toFixed(2)}</div>`).join('');
        const netLeadHtml = (row.materials || []).map(mat => `<div style="border-bottom:1px dotted #ccc; padding:2px 0; color:#3b82f6; font-weight:bold;">${(mat.lead || 0).toFixed(2)}</div>`).join('');
        const totalLeadHtml = (row.materials || []).map(mat => `<div style="border-bottom:1px dotted #ccc; padding:2px 0;">${((mat.lead || 0) * (mat.qty || 0)).toFixed(2)}</div>`).join('');
        return `
          <tr>
            <td class="center bold">${i+1}</td>
            <td class="center bold" style="color:red;">${row.ssr || ''}</td>
            <td class="left">${row.description || ''}</td>
            <td class="center">${row.unit || ''}</td>
            <td class="center bold">${(row.basicRate || 0).toFixed(2)}</td>
            <td class="center">${(row.deduct || 0).toFixed(2)}</td>
            <td class="center">${(row.netAfterDeduct || 0).toFixed(2)}</td>
            <td class="left">${materialsHtml}</td>
            <td class="center">${qtyHtml}</td>
            <td class="center">${netLeadHtml}</td>
            <td class="center">${totalLeadHtml}</td>
            <td class="center">${(row.total || 0).toFixed(2)}</td>
            <td class="center">${(row.tribal || 0).toFixed(2)}</td>
            <td class="center bold">${(row.netTotal || 0).toFixed(2)}</td>
            <td class="center" style="font-size:9px;">${row.specs || ''}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  </div>
</body>
</html>`;
}
