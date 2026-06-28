import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const fields = req.body?.data?.fields || [];

    const getValue = (label) =>
      fields.find((field) => field.label === label)?.value || "";

    const lead = {
      owner: getValue("Name"),
      phone: getValue("Phone Number"),
      state: getValue("State/Market"),
      county: "Tally Lead",
      address: "Free Lead Request",
      overage: 0,
      status: "New"
    };

    const { error } = await supabase.from("leads").insert(lead);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
