import axios from "axios";

export const imageAI = {
  generate: async (prompt: string, apiKey?: string) => {
    const TOGETHER_API_KEY = apiKey || process.env.TOGETHER_API_KEY;
    if (!TOGETHER_API_KEY) {
      return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop`;
    }

    try {
      const response = await axios.post(
        "https://api.together.xyz/v1/images/generations",
        {
          model: "black-forest-labs/FLUX.1-schnell",
          prompt: `Instagram post style, high quality, professional photography, ${prompt}`,
          width: 1024,
          height: 1024,
          steps: 4,
          n: 1,
          response_format: "b64_json",
        },
        {
          headers: {
            Authorization: `Bearer ${TOGETHER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return `data:image/png;base64,${response.data.data[0].b64_json}`;
    } catch (error: any) {
      console.error("Image Gen Error:", error.response?.data || error.message);
      return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop`;
    }
  },

  generateBatch: async (prompts: string[], apiKey?: string): Promise<string[]> => {
    return Promise.all(prompts.map(p => imageAI.generate(p, apiKey)));
  }
};
