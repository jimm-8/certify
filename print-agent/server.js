const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { print, getPrinters } = require("pdf-to-printer");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PRINT_AGENT_PORT || 3100;

app.use(cors());
app.use(morgan("tiny"));

// Accept raw PDF bytes
app.use(
  express.raw({
    type: ["application/pdf"],
    limit: "30mb",
  })
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/printers", async (req, res) => {
  try {
    const printers = await getPrinters();
    res.json({ printers });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post("/print", async (req, res) => {
  try {
    if (!req.body || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: "PDF bytes required" });
    }

    const printer = req.query.printer || undefined; // optional
    const copies = Number(req.query.copies || 1);

    const tmpFile = path.join(
      os.tmpdir(),
      `certify_print_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`
    );
    fs.writeFileSync(tmpFile, req.body);

    const options = {
      printer,
      copies: Number.isFinite(copies) && copies > 0 ? copies : 1,
    };

    await print(tmpFile, options);

    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // ignore cleanup errors
    }

    res.json({ status: "printed", printer: printer || "default" });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Print agent running on http://127.0.0.1:${PORT}`);
});
