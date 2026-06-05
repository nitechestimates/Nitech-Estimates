import xlsx from "xlsx";
import fs from "fs";

const workbook = xlsx.readFile("SSR EDI - Final for permanent.xlsx");
const sheet = workbook.Sheets["SSR 2022-23"];

// 🔥 Skip the title row (Row 0) and use Row 1 as headers
const rawRows = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: "", raw: false });

// 🔥 Normalize row keys & values for compatibility
const rows = rawRows.map(row => {
  const normalized = {};
  for (const key in row) {
    if (key.startsWith("__EMPTY")) continue;
    // Collapse all whitespace sequences (including newlines and multiple spaces) into a single space
    const cleanKey = key.replace(/\s+/g, " ").trim();
    normalized[cleanKey] = row[key];
  }

  // Standardize key names
  const ssrItemNo = normalized["SSR Item No."] || normalized["SSR    Item No."];
  if (ssrItemNo !== undefined) {
    normalized["SSR    Item No."] = String(ssrItemNo).trim();
  } else {
    normalized["SSR    Item No."] = "";
  }

  normalized["Description of the item"] = normalized["Description of the item"] || "";
  normalized["Unit"] = normalized["Unit"] || "";
  normalized["Chapter"] = normalized["Chapter"] || "";
  normalized["Additional Specification"] = normalized["Additional Specification"] || "";

  // Map 2022-23 completed rate and labour rate to 2021-22 keys for full backward compatibility
  const completedRate22 = normalized["Completed Rate for 2022-23 excluding GST In Rs."];
  if (completedRate22 !== undefined) {
    normalized["Completed Rate for 2021-22 excluding GST In Rs."] = completedRate22;
  }
  const labourRate22 = normalized["Labour Rate for 2022-23 excluding GST In Rs."];
  if (labourRate22 !== undefined) {
    normalized["Labour Rate for 2021-22 excluding GST In Rs."] = labourRate22;
  }

  return normalized;
});

function isNumericSSR(val) {
  return /^\d+(\.\d+)?$/.test(val);
}

function isSingleLetter(val) {
  return /^[a-z]$/i.test(val);
}

const processedRows = [];
let i = 0;

while (i < rows.length) {
  const row = rows[i];
  const ssr = row["SSR    Item No."];

  if (isNumericSSR(ssr) && i + 1 < rows.length) {
    let j = i + 1;
    const children = [];

    while (j < rows.length) {
      const nextSSR = rows[j]["SSR    Item No."];

      if (isSingleLetter(nextSSR)) {
        children.push(rows[j]);
        j++;
      } else {
        break;
      }
    }

    if (children.length > 0) {
      // ✅ KEEP PARENT (THIS WAS YOUR ISSUE)
      processedRows.push({
        ...row,
        "SSR    Item No.": ssr
      });

      // ✅ CHILDREN
      for (const child of children) {
        const suffix = child["SSR    Item No."];
        const fullSSR = ssr + suffix;

        const newRow = { ...child };
        newRow["SSR    Item No."] = fullSSR;

        if (!newRow["Chapter"]) newRow["Chapter"] = row["Chapter"];
        if (!newRow["Reference No."]) newRow["Reference No."] = row["Reference No."];

        processedRows.push(newRow);
      }

      i = j;
      continue;
    }
  }

  processedRows.push(row);
  i++;
}

// save
fs.writeFileSync("app/lib/data.json", JSON.stringify(processedRows, null, 2));

console.log("✅ FINAL FIX (PARENT + CHILD BOTH PRESENT)");
