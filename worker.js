
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/summarize" && request.method === "POST") {
      return handleSummarize(request, env);
    }

    if (url.pathname === "/api/groq-module" && request.method === "GET") {
      return handleGroqModels(env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleSummarize(request, env) {
  try {
    if (!env.GROQ_API_KEY) {
      return Response.json(
        { error: "GROQ_API_KEY is missing." },
        { status: 500 }
      );
    }

    const { text, length = "medium", language = "en-US" } =
      await request.json();

    if (typeof text !== "string" || !text.trim()) {
      return Response.json(
        { error: "Please provide some text." },
        { status: 400 }
      );
    }

    const instructions = {
      short: "Make a very concise summary containing only the most important points.",
      medium: "Create a clear and balanced summary containing the main ideas and supporting details.",
      long: "Create a detailed summary covering the major ideas, facts and conclusions."
    };

    const outputLanguage =
      language === "id-ID" ? "Bahasa Indonesia" : "English";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{
            role: "user",
            content: `
Summarise the following text entirely in ${outputLanguage}.

${instructions[length] || instructions.medium}

Rules:
- Accept input in any language.
- Preserve important facts and figures.
- Do not invent information.
- Return only the final summary.

TEXT:
${text}
`
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message || "Groq API error." },
        { status: 502 }
      );
    }

    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      return Response.json(
        { error: "Groq returned an empty response." },
        { status: 502 }
      );
    }

    return Response.json({ summary: summary.trim() });

  } catch (error) {
    console.error("Summarization error:", error);

    return Response.json(
      { error: "Unable to generate summary." },
      { status: 500 }
    );
  }
}

async function handleGroqModels(env) {
  if (!env.GROQ_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY is missing." },
      { status: 500 }
    );
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/models",
    {
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`
      }
    }
  );

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
