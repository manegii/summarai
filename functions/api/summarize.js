
export async function onRequestPost({ request, env }) {
  try {
    const { text, length = "medium", language = "en-US" } =
      await request.json();

    if (!text || !text.trim()) {
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
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
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
      throw new Error(data.error?.message || "Groq API error");
    }

    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("Groq returned an empty response.");
    }

    return Response.json({ summary: summary.trim() });

  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to generate summary." },
      { status: 500 }
    );
  }
}
