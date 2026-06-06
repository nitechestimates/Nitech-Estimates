import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePDF } from '@/lib/pdf-generator';
import { getBillingHtml } from '@/lib/templates/billingHtml';
import { handleError } from '@/lib/errorHandler';

export const maxDuration = 60;

export async function POST(req) {
  try {
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
    
    const originalMeasurementItems = bData.originalMeasurementItems || eData.measurementItems || [];
    const msOrigMap = new Map(originalMeasurementItems.map(item => [item.id, item]));

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

    const msMap = new Map(measurementItems.map(item => [item.id, item]));
    const eRows = eData.rows || [];
    
    const abstractRows = eRows.map((raItem, idx) => {
      const msItem = msMap.get(raItem.id);
      const executedQty = msItem?.totalQty !== undefined ? msItem.totalQty : 0;
      
      const custom = abstractCustomData[raItem.id] || {};
      const useReducedRate = custom.useReducedRate || false;
      const reducedRateVal = custom.reducedRate !== undefined && custom.reducedRate !== "" ? parseFloat(custom.reducedRate) : null;
      
      const baseEstimateRate = raItem.netTotal || raItem.netAfterDeduct || 0;
      const customBillingRate = custom.rate !== undefined && custom.rate !== "" ? parseFloat(custom.rate) : baseEstimateRate;
      
      const activeRate = useReducedRate && reducedRateVal !== null ? reducedRateVal : customBillingRate;
      const executedAmount = executedQty * activeRate;

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
        tenderQty,
        tenderRate,
        tenderAmount,
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

    const tenderStandardTotal = standardRows.reduce((sum, r) => sum + r.tenderAmount, 0);
    const tenderGst = (tenderStandardTotal * GST_RATE) / 100;
    const tenderInsurance = (tenderStandardTotal * insuranceRate) / 100;
    const tenderSubtotal = tenderStandardTotal + tenderGst + tenderInsurance;
    const tenderRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.tenderAmount, 0);
    const tenderGrandTotal = tenderSubtotal + tenderRoyaltyTotal;

    const formatMoney = (val) => (val || 0).toFixed(2);

    const htmlContent = getBillingHtml({
      logoBase64,
      extra,
      nameOfWork,
      headDivision,
      subDivision,
      yojana,
      year,
      estAmount,
      adminApprovalNo,
      standardRows,
      royaltyRows,
      executedStandardTotal,
      gstAmount,
      insuranceRate,
      insuranceAmount,
      executedSubtotal,
      executedGrandTotal,
      tenderGrandTotal,
      abstractRows,
      formatMoney
    });

    const pdfBuffer = await generatePDF(htmlContent, {
      margin: { top: '10mm', bottom: '15mm', left: '10mm', right: '10mm' }
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bill_${nameOfWork.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    if (error.status === 503) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return handleError(error, "Failed to generate billing PDF");
  }
}
