import fs from "node:fs";
import path from "node:path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const dataPath = path.join(process.cwd(), "data", "site.json");
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, "utf-8");
      const data = JSON.parse(content);
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(404).json({ success: false, error: "Data file not found" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
