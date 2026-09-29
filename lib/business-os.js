import JSZip from "jszip";
import * as XLSX from "xlsx";
import sharp from "sharp";

const PRESETS = {
  "lawn-care": {
    key: "lawn-care",
    name: "Lawn Care Business OS",
    shortName: "Lawn Care OS",
    subtitle: "Clients • Jobs • Quotes • Routes • Payments • Profit",
    title:
      "Lawn Care Business Spreadsheet, Client CRM, Job Tracker, Quote Calculator, Route Planner, Google Sheets Excel Template",
    tags: [
      "lawn care template",
      "lawn care business",
      "business spreadsheet",
      "client tracker",
      "job tracker",
      "quote calculator",
      "route planner",
      "payment tracker",
      "expense tracker",
      "profit tracker",
      "landscaping template",
      "google sheets",
      "excel template",
    ],
    description: `Run your lawn care business from one organized spreadsheet system instead of scattered notes, apps and paper forms.

WHAT IS INCLUDED
• Business dashboard
• Customer CRM
• Job tracker
• Recurring service schedule
• Quote calculator
• Weekly route planner
• Payment tracker
• Expense tracker
• Profit overview
• Settings / service rate sheet
• Quick-start guide

FORMAT
• Microsoft Excel .XLSX
• Google Sheets compatible: upload the XLSX file to Google Drive and open it with Google Sheets
• Instant digital download

WHO IT IS FOR
Designed for independent lawn care, landscaping, mowing and yard-service businesses that want a simple system for organizing customers, recurring jobs, quotes, routes, payments and profitability.

IMPORTANT
This is a digital product. No physical item will be shipped. The template is designed as an operational organizer and does not replace professional accounting, tax, legal or financial advice.

LICENSE
For use in one buyer's own business. Files may not be resold, redistributed, shared, sublicensed or repackaged as templates for sale.`,
    thumbnails: [
      ["LAWN CARE", "BUSINESS SYSTEM", "Clients • Jobs • Quotes • Routes • Profit"],
      ["RUN YOUR BUSINESS", "IN ONE PLACE", "One workbook. One simple workflow."],
      ["CLIENT CRM", "STAY ORGANIZED", "Customers • Addresses • Service • Next visit"],
      ["JOB TRACKER", "RECURRING SCHEDULE", "Weekly • Biweekly • Monthly services"],
      ["QUOTE CALCULATOR", "PRICE WITH CONFIDENCE", "Lawn size + add-ons + travel"],
      ["ROUTE PLANNER", "PLAN THE WEEK", "Stops • addresses • service • status"],
      ["PAYMENTS + EXPENSES", "KNOW WHAT IS PAID", "Invoices • costs • overdue jobs"],
      ["PROFIT DASHBOARD", "SEE THE NUMBERS", "Revenue • expenses • net profit"],
      ["EXCEL + GOOGLE SHEETS", "READY TO USE", "Download once. Edit anytime."],
      ["EVERYTHING INCLUDED", "COMPLETE BUSINESS OS", "10 connected worksheets + guide"],
    ],
  },
};

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function setWidths(sheet, widths) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

function addSheet(workbook, name, rows, widths = []) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (widths.length) setWidths(sheet, widths);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
  return sheet;
}

function buildWorkbook(preset) {
  const wb = XLSX.utils.book_new();

  const dashboard = addSheet(
    wb,
    "Dashboard",
    [
      [preset.name],
      ["Active Customers", 0],
      ["Completed Jobs", 0],
      ["Revenue", 0],
      ["Expenses", 0],
      ["Net Profit", 0],
      [],
      ["Tip", "Add customers and jobs first. The dashboard formulas update when opened in Excel or Google Sheets."],
    ],
    [24, 62]
  );
  dashboard.B2 = { t: "n", f: 'COUNTA(Customers!A2:A1000)' };
  dashboard.B3 = { t: "n", f: 'COUNTIF(Jobs!F2:F1000,"Completed")' };
  dashboard.B4 = { t: "n", f: 'SUM(Payments!E2:E1000)' };
  dashboard.B5 = { t: "n", f: 'SUM(Expenses!D2:D1000)' };
  dashboard.B6 = { t: "n", f: "B4-B5" };

  addSheet(
    wb,
    "Customers",
    [
      ["Customer ID", "Customer Name", "Phone", "Email", "Address", "Service Type", "Frequency", "Price", "Last Service", "Next Service", "Notes"],
      ["C-001", "Example Customer", "", "", "123 Sample St", "Mow + Edge", "Biweekly", 65, "", "", "Replace this example row"],
    ],
    [14, 24, 18, 28, 34, 22, 16, 12, 16, 16, 34]
  );

  addSheet(
    wb,
    "Jobs",
    [
      ["Job ID", "Date", "Customer ID", "Customer Name", "Service", "Status", "Crew", "Price", "Paid", "Notes"],
      ["J-001", "", "C-001", "Example Customer", "Mow + Edge", "Scheduled", "", 65, "No", "Replace this example row"],
    ],
    [14, 14, 14, 24, 22, 16, 18, 12, 12, 34]
  );

  addSheet(
    wb,
    "Recurring Schedule",
    [
      ["Customer", "Frequency", "Preferred Day", "Next Service", "Price", "Active"],
      ["Example Customer", "Biweekly", "Tuesday", "", 65, "Yes"],
    ],
    [24, 16, 18, 18, 12, 12]
  );

  const quote = addSheet(
    wb,
    "Quote Calculator",
    [
      ["QUOTE CALCULATOR", "VALUE"],
      ["Lawn size (sq ft)", 5000],
      ["Base rate per 1,000 sq ft", 8],
      ["Edging add-on", 10],
      ["Trimming add-on", 15],
      ["Cleanup add-on", 10],
      ["Travel / other", 5],
      ["ESTIMATED QUOTE", 0],
      [],
      ["How it works", "Edit the values above. The quote formula recalculates in Excel / Google Sheets."],
    ],
    [34, 44]
  );
  quote.B8 = { t: "n", f: "ROUND((B2/1000)*B3+B4+B5+B6+B7,2)" };

  addSheet(
    wb,
    "Route Planner",
    [
      ["Day", "Stop", "Customer", "Address", "Service", "Planned Time", "Status"],
      ["Monday", 1, "Example Customer", "123 Sample St", "Mow + Edge", "09:00", "Planned"],
    ],
    [14, 10, 24, 34, 22, 16, 16]
  );

  addSheet(
    wb,
    "Payments",
    [
      ["Invoice", "Date", "Customer", "Status", "Amount", "Due Date", "Paid Date", "Method"],
      ["INV-001", "", "Example Customer", "Unpaid", 65, "", "", ""],
    ],
    [16, 14, 24, 14, 14, 14, 14, 16]
  );

  addSheet(
    wb,
    "Expenses",
    [
      ["Date", "Category", "Description", "Amount", "Notes"],
      ["", "Fuel", "Example fuel expense", 25, "Replace this example row"],
    ],
    [14, 20, 34, 14, 34]
  );

  addSheet(
    wb,
    "Services & Rates",
    [
      ["Service", "Default Price", "Unit / Notes"],
      ["Mowing", 45, "Starting price"],
      ["Edging", 10, "Add-on"],
      ["Trimming", 15, "Add-on"],
      ["Cleanup", 20, "Starting price"],
      ["Leaf cleanup", 60, "Starting price"],
    ],
    [26, 18, 34]
  );

  addSheet(
    wb,
    "Settings",
    [
      ["SETTING", "OPTIONS / NOTES"],
      ["Job Status", "Scheduled, In Progress, Completed, Cancelled"],
      ["Payment Status", "Paid, Unpaid, Overdue"],
      ["Frequency", "Weekly, Biweekly, Monthly, One-time"],
      ["Currency", "Set currency formatting in Excel / Google Sheets if desired"],
    ],
    [24, 66]
  );

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
}

function thumbnailSvg(preset, index) {
  const [kicker, headline, subline] = preset.thumbnails[index];
  const num = String(index + 1).padStart(2, "0");
  const featureLabels = ["CLIENTS", "JOBS", "QUOTES", "ROUTES", "PAYMENTS", "PROFIT"];
  const miniRows = featureLabels
    .slice(index % 3, (index % 3) + 3)
    .map(
      (label, i) => `
      <rect x="1180" y="${430 + i * 160}" width="570" height="112" rx="24" fill="#ffffff" opacity="0.98"/>
      <circle cx="1245" cy="${486 + i * 160}" r="16" fill="#4e765f"/>
      <text x="1290" y="${500 + i * 160}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#2d3b33">${escapeXml(label)}</text>`
    )
    .join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1600" viewBox="0 0 2000 1600">
    <rect width="2000" height="1600" fill="#f5f0e7"/>
    <rect x="0" y="0" width="2000" height="120" fill="#2f4a3a"/>
    <text x="120" y="78" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#ffffff" letter-spacing="5">PAPERNEXA BUSINESS OS</text>
    <text x="1780" y="78" text-anchor="end" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#dfe9e2">${num}</text>

    <text x="120" y="340" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="#4e765f" letter-spacing="4">${escapeXml(kicker)}</text>
    <text x="120" y="470" font-family="Arial, sans-serif" font-size="100" font-weight="900" fill="#223028">${escapeXml(headline)}</text>
    <text x="120" y="560" font-family="Arial, sans-serif" font-size="42" font-weight="500" fill="#667269">${escapeXml(subline)}</text>

    <rect x="1120" y="300" width="690" height="850" rx="42" fill="#dce7df"/>
    <rect x="1160" y="350" width="610" height="120" rx="24" fill="#2f4a3a"/>
    <text x="1210" y="425" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="#ffffff">BUSINESS DASHBOARD</text>
    ${miniRows}
    <rect x="120" y="780" width="850" height="310" rx="34" fill="#ffffff"/>
    <text x="180" y="870" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#2f4a3a">BUILT FOR SMALL SERVICE BUSINESSES</text>
    <text x="180" y="950" font-family="Arial, sans-serif" font-size="32" fill="#59675f">Excel workbook • Google Sheets compatible</text>
    <text x="180" y="1015" font-family="Arial, sans-serif" font-size="32" fill="#59675f">Instant download • Fully editable</text>

    <rect x="120" y="1260" width="1690" height="170" rx="34" fill="#2f4a3a"/>
    <text x="180" y="1360" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="#ffffff">${escapeXml(preset.subtitle)}</text>
  </svg>`;
}

async function buildThumbnailBuffers(preset) {
  const out = [];
  for (let i = 0; i < preset.thumbnails.length; i += 1) {
    const buffer = await sharp(Buffer.from(thumbnailSvg(preset, i)))
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    out.push({ name: `thumbnail-${String(i + 1).padStart(2, "0")}.jpg`, buffer });
  }
  return out;
}

function seoText(preset) {
  return `TITLE\n${preset.title}\n\nDESCRIPTION\n${preset.description}\n\n13 TAGS\n${preset.tags.join("\n")}`;
}

function quickStartText(preset) {
  return `${preset.name}\n\nQUICK START\n\n1. Open the included XLSX file in Microsoft Excel, or upload it to Google Drive and choose Open with Google Sheets.\n2. Replace the example rows in Customers, Jobs, Payments and Expenses.\n3. Add your own service prices in Services & Rates.\n4. Use the Quote Calculator for fast estimates.\n5. Keep recurring customers in Recurring Schedule and plan weekly stops in Route Planner.\n6. Review the Dashboard for a quick business snapshot.\n\nIMPORTANT\nSpreadsheet formulas recalculate when the workbook is opened in Excel or Google Sheets. This template is an organizational tool and is not accounting, tax, legal or financial advice.`;
}

function licenseText() {
  return `PAPERNEXA PERSONAL BUSINESS USE LICENSE\n\nYou may use this template in one business that you own or operate. You may edit it for your own internal business use.\n\nYou may not resell, redistribute, share, sublicense, upload to template marketplaces, or include the source files in another product for sale.\n\nCopyright remains with the original creator. Purchase grants a limited use license, not ownership of the template design.`;
}

export function getBusinessOsPreset(key = "lawn-care") {
  const preset = PRESETS[key];
  if (!preset) throw new Error("Business OS preset bulunamadı.");
  return preset;
}

export async function buildBusinessOsAssets(key = "lawn-care") {
  const preset = getBusinessOsPreset(key);
  const workbook = buildWorkbook(preset);
  const thumbnails = await buildThumbnailBuffers(preset);

  const customerZip = new JSZip();
  customerZip.file("START_HERE.txt", quickStartText(preset));
  customerZip.file("PaperNexa_Lawn_Care_Business_OS.xlsx", workbook);
  customerZip.file("PERSONAL_BUSINESS_USE_LICENSE.txt", licenseText());
  const customerZipBuffer = await customerZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  const sellerZip = new JSZip();
  sellerZip.file("ETSY_SEO.txt", seoText(preset));
  sellerZip.file("Customer_Download_Lawn_Care_Business_OS.zip", customerZipBuffer);
  const thumbFolder = sellerZip.folder("ETSY_THUMBNAILS");
  thumbnails.forEach((item) => thumbFolder.file(item.name, item.buffer));
  const sellerZipBuffer = await sellerZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  return {
    preset,
    workbook,
    thumbnails,
    customerZipBuffer,
    sellerZipBuffer,
    seo: { title: preset.title, description: preset.description, tags: preset.tags },
  };
}
