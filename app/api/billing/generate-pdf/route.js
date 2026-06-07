import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { generatePDF } from '@/lib/pdf-generator';
import { getBillingHtml } from '@/lib/templates/billingHtml';
import { handleError } from '@/lib/errorHandler';
import { calculateBilling } from '@/lib/billingMath';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await rateLimit(`billing-pdf:${session.user.email}`, 5, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.reset / 1000).toString() } }
      );
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

    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "zp-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (err) {
      logger.warn("Could not load ZP logo:", { error: err.message });
    }

    const eRows = eData.rows || [];
    const {
      abstractRows,
      standardRows,
      royaltyRows,
      executedStandardTotal,
      gstAmount,
      insuranceRate,
      insuranceAmount,
      executedSubtotal,
      executedGrandTotal,
      tenderGrandTotal
    } = calculateBilling(measurementItems, eRows, abstractCustomData, originalMeasurementItems, eData.labourInsurance);

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
