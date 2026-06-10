import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const event = req.body;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const customerEmail =
      session.customer_details?.email || session.customer_email;

    if (customerEmail) {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("email", customerEmail.toLowerCase());

      if (error) {
        return res.status(500).json({ error: error.message });
      }
    }
  }

  return res.status(200).json({ received: true });
}
