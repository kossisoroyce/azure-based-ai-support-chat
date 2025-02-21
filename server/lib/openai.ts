import OpenAI from "openai";

// Validate environment variables
const requiredEnvVars = {
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Ensure the endpoint doesn't end with a slash
let endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
if (!endpoint.startsWith('https://')) {
  endpoint = `https://${endpoint}`;
}
endpoint = endpoint.replace(/\/$/, '');

// API version - can be overridden for different model requirements
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

// Initialize OpenAI client with Azure configuration
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": API_VERSION },
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY }
});

// Add detailed logging for configuration debugging
console.log('Azure OpenAI Configuration:', {
  endpoint: new URL(endpoint).hostname,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  apiVersion: API_VERSION,
});

export interface ChatResponse {
  content: string;
  source?: "faq" | "ai";
  confidence?: number;
  language?: string;
  suggestions?: string[];
  needsHumanReview?: boolean;
  sentiment?: string;
}

// Model-specific parameters
interface ModelConfig {
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  stop?: string[];
}

const defaultModelConfig: ModelConfig = {
  temperature: 0.7,
  top_p: 0.95,
  frequency_penalty: 0,
  presence_penalty: 0,
  max_tokens: 800,
};

// Add custom configurations for different model types
const modelConfigs = {
  standard: defaultModelConfig,
  finetuned: {
    ...defaultModelConfig,
    temperature: 0.5, // Lower temperature for more focused outputs
    max_tokens: 1000, // Allow longer responses for complex queries
    frequency_penalty: 0.2, // Slightly increase diversity
  },
  specialized: {
    ...defaultModelConfig,
    temperature: 0.3, // Much lower temperature for highly specialized responses
    max_tokens: 1500, // Allow even longer responses
    presence_penalty: 0.1, // Encourage focused, domain-specific responses
  }
};

async function detectLanguage(text: string, modelConfig: ModelConfig = {}): Promise<string> {
  try {
    console.log('Attempting to detect language with deployment:', process.env.AZURE_OPENAI_DEPLOYMENT);
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        {
          role: "system",
          content: "You are a language detector. Respond with only the ISO 639-1 language code.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      ...{ ...defaultModelConfig, ...modelConfig },
    });

    return response.choices[0].message.content?.trim().toLowerCase() || "en";
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error detecting language:', {
        message: error.message,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
        endpoint: endpoint
      });

      // Check for specific deployment-related errors
      if (error.message.includes('deployment') || error.message.includes('404')) {
        console.error('Deployment error - please verify Azure OpenAI deployment configuration');
      }
    }
    return "en";
  }
}

async function summarizeConversation(
  messages: { role: string; content: string }[],
  modelConfig: ModelConfig = {}
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        {
          role: "system",
          content: "Summarize the following conversation in a concise paragraph:",
        },
        ...messages.map(m => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content
        })),
      ],
      ...{ ...defaultModelConfig, ...modelConfig },
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    return "";
  }
}

export async function generateResponse(
  messages: { role: string; content: string }[],
  faqs: { question: string; answer: string; language?: string }[],
  contextMemory?: any,
  language = "en",
  modelConfig: ModelConfig = {}
): Promise<ChatResponse> {
  try {
    // First detect language if not provided
    const userMessage = messages[messages.length - 1].content;
    const detectedLanguage = await detectLanguage(userMessage, modelConfig);

    // Filter FAQs by language
    const languageFilteredFaqs = faqs.filter(
      faq => !faq.language || faq.language === detectedLanguage
    );

    // Check FAQs first with lower temperature for more precise matching
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      try {
        const response = await openai.chat.completions.create({
          model: process.env.AZURE_OPENAI_DEPLOYMENT!,
          messages: [
            {
              role: "system",
              content: `You are a FAQ matcher. Given the following FAQs and a user question, determine if any FAQ matches. Return your response as a JSON object with the following structure: {"matches": boolean, "answer": string, "confidence": number, "suggestions": string[], "needsHumanReview": boolean}

FAQs:
${languageFilteredFaqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n")}`,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
          ...{ ...defaultModelConfig, ...modelConfig, temperature: 0.1 }, // Lower temperature for FAQ matching
          response_format: { type: "json_object" },
        });

        const responseContent = response.choices[0].message.content;
        if (!responseContent) {
          throw new Error("Azure OpenAI returned empty response");
        }

        const result = JSON.parse(responseContent);
        if (result.matches && result.confidence > 0.8) {
          return {
            content: result.answer,
            source: "faq",
            confidence: result.confidence,
            language: detectedLanguage,
            suggestions: result.suggestions,
            needsHumanReview: result.needsHumanReview,
          };
        }
      } catch (error) {
        console.error('Error matching FAQs:', error);
      }
    }

    // Generate context-aware AI response
    const systemPrompt = `You are a helpful customer support agent. 
Language: ${detectedLanguage}
Context: ${contextMemory?.summary || "No previous context"}

Instructions for custom-trained model:
- Leverage your domain-specific training
- Maintain consistent tone and style
- Use industry-specific terminology appropriately
- Follow company-specific guidelines and policies
- Ensure responses align with training data context

Be concise, professional, and friendly. If you cannot help, suggest human review.
Generate 2-3 relevant follow-up suggestions for the user.`;

    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
      ],
      ...{ ...defaultModelConfig, ...modelConfig },
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("Azure OpenAI returned empty response");
    }

    // Generate suggestions with slightly higher temperature for creativity
    const suggestionsResponse = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        {
          role: "system",
          content: "Generate 3 short, relevant follow-up questions or responses based on this message. Return as JSON array.",
        },
        {
          role: "user",
          content: responseContent,
        },
      ],
      ...{ ...defaultModelConfig, ...modelConfig, temperature: 0.8 },
      response_format: { type: "json_object" },
    });

    const suggestions = JSON.parse(suggestionsResponse.choices[0].message.content || "[]");

    return {
      content: responseContent,
      source: "ai",
      language: detectedLanguage,
      suggestions: suggestions.suggestions || [],
      needsHumanReview: responseContent.toLowerCase().includes("human") || false,
    };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

export async function updateConversationContext(
  messages: { role: string; content: string }[],
  modelConfig: ModelConfig = {}
): Promise<{ summary: string }> {
  const summary = await summarizeConversation(messages, modelConfig);
  return { summary };
}