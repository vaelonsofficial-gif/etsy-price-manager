const COSTS = {
  framed: {
    "35x50cm":84.21,"13x18cm":63.97,"20.3x25.4cm":68.34,"21x30cm":69.99,
    "27.9x35.6cm":74.19,"30x40cm":78.28,"30x45cm":79.93,"40x50cm":99.98,
    "40x60cm":110.68,"45.2x60.9cm":116.88,"50x70cm":133.80,"55x95cm":163.66,
    "61x76.2cm":162.04,"61x82cm":170.26,"70x100cm":202.94,"70x125cm":249.19,
    "20x20cm":66.69,"30x30cm":72.54,"40x40cm":80.91,"50x50cm":110.68,
    "60x60cm":135.45,"70x70cm":163.69,"80x80cm":186.28,"90x90cm":238.20
  },
  rolled: {
    "35x50cm":51.60,"13x18cm":48.30,"20.3x25.4cm":49.12,"21x30cm":49.95,
    "27.9x35.6cm":50.77,"30x40cm":50.77,"30x45cm":51.60,"40x50cm":53.25,
    "40x60cm":53.25,"45.2x60.9cm":55.72,"50x70cm":56.55,"55x95cm":57.37,
    "61x76.2cm":58.20,"61x82cm":59.02,"70x100cm":60.67,"70x125cm":62.32,
    "20x20cm":49.12,"30x30cm":50.77,"40x40cm":51.60,"50x50cm":54.07,
    "60x60cm":55.72,"70x70cm":58.20,"80x80cm":60.67,"90x90cm":62.32
  },
  stretched: {
    "35x50cm":75.96,"13x18cm":57.37,"20.3x25.4cm":60.92,"21x30cm":61.74,
    "27.9x35.6cm":65.12,"30x40cm":67.59,"30x45cm":71.68,"40x50cm":75.96,
    "40x60cm":90.08,"45.2x60.9cm":99.13,"50x70cm":105.33,"55x95cm":134.36,
    "61x76.2cm":129.42,"61x82cm":129.42,"70x100cm":156.63,"70x125cm":181.61,
    "20x20cm":60.09,"30x30cm":65.12,"40x40cm":69.21,"50x50cm":91.73,
    "60x60cm":106.98,"70x70cm":129.42,"80x80cm":147.16,"90x90cm":169.68
  }
};

const CONFIRMED = {
  "framed:70x100cm": {
    cost_usd: 111.95,
    note: "Confirmed real all-in cost: 5,500 TRY using 49.1275 TRY/USD"
  }
};

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[×✕*]/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectStyle(value) {
  const text = normalizeText(value);
  if (/\b(rolled|roll-up|roll up|unstretched|unframed canvas|canvas roll)\b/.test(text)) return "rolled";
  if (/\b(framed|frame|floater|floating frame|framed canvas)\b/.test(text) && !/\bunframed\b/.test(text)) return "framed";
  if (/\b(stretched|stretch canvas|gallery wrap|gallery canvas|ready to hang|ready-to-hang|frameless canvas)\b/.test(text)) return "stretched";
  return null;
}

function normalizeSize(value) {
  const text = normalizeText(value);
  let m = text.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm\b/i);
  let unit = "cm";
  if (!m) {
    m = text.match(/(\d+(?:[.,]\d+)?)\s*"\s*x\s*(\d+(?:[.,]\d+)?)\s*"/i);
    unit = "in";
  }
  if (!m) return null;

  let a = Number(m[1].replace(",", "."));
  let b = Number(m[2].replace(",", "."));
  if (unit === "in") {
    a *= 2.54;
    b *= 2.54;
  }
  [a,b] = [a,b].sort((x,y)=>x-y);

  const fmt = (n) => {
    const rounded = Math.round(n * 10) / 10;
    return Math.abs(rounded - Math.round(rounded)) < 0.05
      ? String(Math.round(rounded))
      : String(rounded);
  };

  // Map common inch-derived dimensions back to the exact VAELONS catalog keys.
  const aliases = [
    ["13x18cm",[13,18]],["20.3x25.4cm",[20.3,25.4]],["21x30cm",[21,30]],
    ["27.9x35.6cm",[27.9,35.6]],["30x40cm",[30,40]],["30x45cm",[30,45]],
    ["35x50cm",[35,50]],["40x50cm",[40,50]],["40x60cm",[40,60]],
    ["45.2x60.9cm",[45.2,60.9]],["50x70cm",[50,70]],["55x95cm",[55,95]],
    ["61x76.2cm",[61,76.2]],["61x82cm",[61,82]],["70x100cm",[70,100]],
    ["70x125cm",[70,125]],["20x20cm",[20,20]],["30x30cm",[30,30]],
    ["40x40cm",[40,40]],["50x50cm",[50,50]],["60x60cm",[60,60]],
    ["70x70cm",[70,70]],["80x80cm",[80,80]],["90x90cm",[90,90]]
  ];

  let best = null;
  let bestScore = Infinity;
  for (const [key,dims] of aliases) {
    const score =
      Math.abs(a-dims[0]) / Math.max(dims[0],1) +
      Math.abs(b-dims[1]) / Math.max(dims[1],1);
    if (score < bestScore) {
      bestScore = score;
      best = key;
    }
  }

  if (best && bestScore <= 0.12) return best;
  return `${fmt(a)}x${fmt(b)}cm`;
}

export function getVaelonsCost({ variationKey, label }) {
  const combined = `${variationKey || ""} ${label || ""}`;
  const style = detectStyle(combined);
  const size = normalizeSize(combined);

  if (!style || !size) {
    return {
      found: false,
      style,
      size,
      cost_usd: null,
      confidence: "missing",
      note: "Cost rule could not be matched"
    };
  }

  const confirmed = CONFIRMED[`${style}:${size}`];
  if (confirmed) {
    return {
      found: true,
      style,
      size,
      cost_usd: confirmed.cost_usd,
      confidence: "confirmed",
      note: confirmed.note
    };
  }

  const cost = COSTS?.[style]?.[size];

  return {
    found: Number.isFinite(cost),
    style,
    size,
    cost_usd: Number.isFinite(cost) ? cost : null,
    confidence: Number.isFinite(cost) ? "excel" : "missing",
    note: Number.isFinite(cost)
      ? "Original VAELONS cost workbook"
      : "Cost rule not found"
  };
}
