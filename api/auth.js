export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { password } = req.body || {};
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "saidkhan2026";

  if (password === ADMIN_PASSWORD) {
    const token = `token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return res.status(200).json({ success: true, token, user: "Said Khan" });
  } else {
    return res.status(401).json({ success: false, error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।" });
  }
}
