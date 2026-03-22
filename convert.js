const xlsx = require("xlsx");
const fs = require("fs");

const workbook = xlsx.readFile("data.xlsx");
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const jsonData = xlsx.utils.sheet_to_json(sheet);

fs.writeFileSync("data.json", JSON.stringify(jsonData, null, 2));

console.log("Converted to JSON!");