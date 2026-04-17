const xlsx = require("xlsx");
const fs = require("fs");

const workbook = xlsx.readFile("data.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// 🔥 ADDED `raw: false` HERE
// This prevents xlsx from turning "51.130" into the number 51.13
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });

// 🔥 VERY IMPORTANT FIX
rows.forEach(row => {
  if (row["SSR    Item No."] !== undefined) {
    row["SSR    Item No."] = String(row["SSR    Item No."]).trim();
  }
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