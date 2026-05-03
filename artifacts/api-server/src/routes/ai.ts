import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

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

    const validMessages = messages.filter(
      (m) => m.role === "user" || m.role === "assistant"
    ) as Array<{ role: "user" | "assistant"; content: string }>;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: validMessages,
    });

    const content =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    res.json({ content });
  } catch (err) {
    req.log?.error({ err }, "AI chat error");
    res.status(500).json({ error: "AI request failed", content: "" });
  }
});

export default router;
