const xlsx = require("xlsx");
const fs = require("fs");

// Read the leads Excel file
const workbook = xlsx.readFile("leads.xlsx");
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to array of rows (including header)
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

// First row contains material names (columns B..K)
const headers = rows[0].slice(1, 11); // columns B to K

// Distances are in column A (index 0), starting from row 2
const distances = rows.slice(1).map(row => row[0]).filter(d => d !== "");

// Build leads object
const leads = {};

headers.forEach((header, colIdx) => {
  if (!header) return;
  // Trim and keep exact spacing (important!)
  const material = header.trim();
  leads[material] = {};

  rows.slice(1).forEach((row, rowIdx) => {
    const distance = distances[rowIdx];
    if (distance === undefined || distance === "") return;
    const value = row[colIdx + 1]; // +1 because colIdx 0 corresponds to column B
    if (value !== undefined && value !== "") {
      leads[material][distance] = parseFloat(value);
    }
  });
});

// Write to lib/leads.json (project root)
fs.writeFileSync("lib/leads.json", JSON.stringify(leads, null, 2));
console.log("Leads data converted to JSON at lib/leads.json");