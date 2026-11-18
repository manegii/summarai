
export async function onRequestGet({ env }) {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/models",
      {
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`
        }
      }
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status
    });

  } catch (error) {
    return Response.json(
      { error: "Unable to retrieve Groq models." },
      { status: 500 }
    );
  }
}
