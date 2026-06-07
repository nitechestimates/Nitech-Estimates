import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { generatePDF } from '@/lib/pdf-generator';
import { getEstimateHtml } from '@/lib/templates/estimateHtml';
import { handleError } from '@/lib/errorHandler';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await rateLimit(`generate-pdf:${session.user.email}`, 5, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.reset / 1000).toString() } }
      );
    }

    const { estimateData } = await req.json();
    const data = estimateData || {};
    
    const dataRows = data.rows || [];
    const dataMeasurementItems = data.measurementItems || [];
    if (dataRows.length > 1000 || dataMeasurementItems.length > 1000) {
      return NextResponse.json(
        { error: 'Payload too large: rows or measurementItems count exceeds limit' },
        { status: 400 }
      );
    }

    const nameOfWork = data.nameOfWork || "Unknown Work";
    const isTribal = data.isTribal || false;
    const tribalPercent = data.tribalPercent || '';
    const rows = dataRows;
    const leadSettings = data.leadSettings || {};
    const leadCategories = Object.keys(leadSettings);
    const measurementItems = dataMeasurementItems;

    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "zp-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn("Could not load ZP logo image:", err);
    }

    const msMap = new Map((Array.isArray(measurementItems) ? measurementItems : []).map(item => [item.id, item]));
    const abstractCustomData = data.abstractCustomData || {};

    const abstractRows = rows.map((raItem, idx) => {
      const msItem = msMap.get(raItem.id);
      const totalQty = msItem?.totalQty || 0;
      
      const custom = abstractCustomData[raItem.id] || {};
      const useReducedRate = custom.useReducedRate || false;
      const reducedRateVal = custom.reducedRate !== undefined && custom.reducedRate !== "" ? parseFloat(custom.reducedRate) : null;
      
      const rate = raItem.netTotal || raItem.netAfterDeduct || 0;
      const activeRate = useReducedRate && reducedRateVal !== null ? reducedRateVal : rate;
      const amount = totalQty * activeRate;
      
      return {
        id: raItem.id,
        srNo: idx + 1,
        description: raItem.description,
        specs: raItem.specs || "",
        qty: totalQty,
        unit: raItem.unit,
        basicRate: rate,
        useReducedRate,
        reducedRate: reducedRateVal,
        rate: activeRate,
        amount,
        isRoyalty: raItem.isRoyalty
      };
    });

    const standardRows = abstractRows.filter(r => !r.isRoyalty);
    const royaltyRows = abstractRows.filter(r => r.isRoyalty);

    const totalAmount = standardRows.reduce((sum, r) => sum + r.amount, 0);

    const GST_RATE = 18;
    let LABOUR_INSURANCE_RATE = 0.5;
    if (data.labourInsurance && !isNaN(parseFloat(data.labourInsurance))) {
      LABOUR_INSURANCE_RATE = parseFloat(data.labourInsurance);
    } else {
      LABOUR_INSURANCE_RATE = totalAmount > 2500000 ? 1.0 : 0.5;
    }

    const totalGST = (totalAmount * GST_RATE) / 100;
    const totalLabourInsurance = (totalAmount * LABOUR_INSURANCE_RATE) / 100;
    const subTotalWithTax = totalAmount + totalGST + totalLabourInsurance;

    const royaltySandRow = royaltyRows.find(r => r.id === "royalty-sand" || r.description.toLowerCase().includes("sand"));
    const royaltyOthersRow = royaltyRows.find(r => r.id === "royalty-others" || r.description.toLowerCase().includes("others"));
    const labChargesRow = royaltyRows.find(r => r.id === "lab-charges" || r.description.toLowerCase().includes("lab"));

    const totalRoyaltySand = royaltySandRow ? royaltySandRow.amount : 0;
    const totalRoyaltyOthers = royaltyOthersRow ? royaltyOthersRow.amount : 0;
    const totalLabCharges = labChargesRow ? labChargesRow.amount : 0;

    const grandTotal = subTotalWithTax + totalRoyaltySand + totalRoyaltyOthers + totalLabCharges;

    const year = data.year || "2024-25";
    const headDivision = data.headDivision || "";
    const subDivision = data.subDivision || "";
    const deputyEngineer = data.deputyEngineer || "";
    const jrEngineer = data.jrEngineer || "";
    const adminApprovalNo = data.adminApprovalNo || "";
    const yojana = data.yojana || "";
    const estAmount = data.estAmount || grandTotal.toFixed(2);

    const htmlContent = getEstimateHtml({
      logoBase64,
      dist: data.dist,
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
      grandTotal,
      standardRows,
      royaltyRows,
      measurementItems,
      leadCategories,
      leadSettings,
      isTribal,
      tribalPercent,
      rows
    });

    const pdfBuffer = await generatePDF(htmlContent, {
      margin: { top: '15mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Estimate_${nameOfWork.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    if (error.status === 503) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return handleError(error, 'PDF generation failed');
  }
}