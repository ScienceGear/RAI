import { Router, Request, Response } from "express";

const router = Router();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, system, maxTokens = 512 } = req.body as {
      messages: Array<{ role: string; content: string }>;
      system?: string;
      maxTokens?: number;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      req.log?.error("GROQ_API_KEY not configured");
      res.status(500).json({ error: "AI not configured", content: "" });
      return;
    }

    const validMessages = messages.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );

    const groqMessages: Array<{ role: string; content: string }> = [];
    if (system) {
      groqMessages.push({ role: "system", content: system });
    }
    groqMessages.push(...validMessages);

    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      req.log?.error({ status: groqRes.status, body: errText }, "Groq API error");
      res.status(500).json({ error: "AI request failed", content: "" });
      return;
    }

    const data = await groqRes.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log?.error({ err }, "AI chat error");
    res.status(500).json({ error: "AI request failed", content: "" });
  }
});

export default router;
