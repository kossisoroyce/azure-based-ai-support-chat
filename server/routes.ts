import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { generateResponse, updateConversationContext } from "./lib/openai";
import { insertMessageSchema, insertFaqSchema } from "@shared/schema";
import { z } from "zod";

interface WebSocketMessage {
  type: string;
  payload: any;
}

// Add model configuration for different scenarios
const modelConfigs = {
  faq: {
    temperature: 0.1,
    max_tokens: 300,
  },
  chat: {
    temperature: 0.7,
    max_tokens: 800,
  },
  summary: {
    temperature: 0.3,
    max_tokens: 200,
  }
};

// Add new error handling utility
function handleWebSocketError(ws: WebSocket, error: unknown) {
  console.error('WebSocket error:', error);
  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  try {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { message: errorMessage },
      })
    );
  } catch (sendError) {
    console.error('Failed to send error message to client:', sendError);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    clientTracking: true,
  });

  // Add WebSocket server error handling
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // API Routes
  app.get("/api/faqs", async (req, res) => {
    try {
      const language = req.query.language as string;
      const faqs = await storage.getFAQs(language);
      res.json(faqs);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/faqs", async (req, res) => {
    try {
      const data = insertFaqSchema.parse(req.body);
      const faq = await storage.createFAQ(data);
      res.json(faq);
    } catch (error) {
      console.error('Error creating FAQ:', error);
      res.status(400).json({ error: "Invalid FAQ data" });
    }
  });

  app.patch("/api/faqs/:id", async (req, res) => {
    try {
      const id = z.number().parse(parseInt(req.params.id));
      const data = insertFaqSchema.partial().parse(req.body);
      const faq = await storage.updateFAQ(id, data);
      res.json(faq);
    } catch (error) {
      console.error('Error updating FAQ:', error);
      res.status(400).json({ error: "Invalid FAQ update data" });
    }
  });

  app.delete("/api/faqs/:id", async (req, res) => {
    try {
      const id = z.number().parse(parseInt(req.params.id));
      await storage.deleteFAQ(id);
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(400).json({ error: "Invalid FAQ ID" });
    }
  });

  app.get("/api/crm/:customerId", async (req, res) => {
    try {
      const customerId = req.params.customerId;
      const data = await storage.getCrmData(customerId);
      if (!data) {
        res.status(404).json({ message: "Customer not found" });
        return;
      }
      res.json(data);
    } catch (error) {
      console.error('Error fetching CRM data:', error);
      res.status(500).json({ error: "Failed to fetch customer data" });
    }
  });

  // Add new API route for popular searches
  app.get("/api/popular-searches", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const searches = await storage.getPopularSearches(limit);
      res.json(searches);
    } catch (error) {
      console.error('Error fetching popular searches:', error);
      res.status(500).json({ error: "Failed to fetch popular searches" });
    }
  });

  // WebSocket handling
  wss.on("connection", async (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    let conversationId: number | null = null;
    let contextMemory: any = null;

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on("close", () => {
      console.log('WebSocket connection closed');
    });

    ws.on("message", async (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        console.log('Received WebSocket message:', message.type);

        switch (message.type) {
          case "start_conversation": {
            try {
              // Log Azure deployment configuration
              console.log('Starting conversation with Azure deployment:', {
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
              });

              const crmData = await storage.getCrmData(message.payload.customerId);
              const conversation = await storage.createConversation({
                customerId: message.payload.customerId,
                status: "active",
                language: crmData?.preferredLanguage || "en",
                settings: message.payload.settings || {},
              });
              conversationId = conversation.id;

              const welcomeMessage = await storage.createMessage({
                conversationId: conversation.id,
                content: "Hello! I'm your AI assistant, ready to help you with any questions or concerns you may have. How can I assist you today?",
                role: "assistant",
                timestamp: new Date(),
                language: crmData?.preferredLanguage || "en",
              });

              const messages = [welcomeMessage];
              ws.send(
                JSON.stringify({
                  type: "conversation_started",
                  payload: {
                    conversationId,
                    messages,
                    settings: conversation.settings,
                  },
                })
              );
            } catch (error) {
              if (error instanceof Error && 
                  (error.message.includes('deployment') || error.message.includes('404'))) {
                handleWebSocketError(ws, new Error(
                  "Azure OpenAI deployment configuration error. Please verify deployment settings."
                ));
              } else {
                handleWebSocketError(ws, error);
              }
            }
            break;
          }

          case "message": {
            try {
              if (!conversationId) {
                throw new Error("No active conversation");
              }

              let content = message.payload.content || "";
              if (message.payload.attachment) {
                if (message.payload.attachment.type.startsWith('image/')) {
                  content += "\n[Image attached]";
                } else if (message.payload.attachment.type === 'application/pdf') {
                  content += "\n[PDF document attached]";
                }
              }

              const messageData = insertMessageSchema.parse({
                conversationId,
                content,
                role: "user",
              });

              const userMessage = await storage.createMessage({
                ...messageData,
                attachment: message.payload.attachment,
              });

              ws.send(
                JSON.stringify({
                  type: "message",
                  payload: { message: userMessage },
                })
              );

              // Send typing indicator
              ws.send(JSON.stringify({ type: "typing" }));

              // Get conversation history and context
              const messages = await storage.getMessages(conversationId);
              const faqs = await storage.getFAQs();

              // Update conversation context with summary configuration
              contextMemory = await updateConversationContext(
                messages.map(m => ({ role: m.role, content: m.content })),
                modelConfigs.summary
              );

              // Generate AI response with chat configuration
              const response = await generateResponse(
                messages.map(m => ({
                  role: m.role,
                  content: m.content,
                })),
                faqs,
                contextMemory,
                userMessage.language,
                modelConfigs.chat
              );

              // Save AI response
              const aiMessage = await storage.createMessage({
                conversationId,
                content: response.content,
                role: "assistant",
                language: response.language,
                suggestions: response.suggestions,
                needsHumanReview: response.needsHumanReview,
              });

              // Update conversation with new context
              await storage.updateConversation(conversationId, {
                summary: contextMemory.summary,
                contextMemory,
              });

              ws.send(
                JSON.stringify({
                  type: "message",
                  payload: {
                    message: aiMessage,
                    source: response.source,
                    confidence: response.confidence,
                    suggestions: response.suggestions,
                    needsHumanReview: response.needsHumanReview,
                  },
                })
              );
            } catch (error) {
              handleWebSocketError(ws, error);
            }
            break;
          }

          case "update_settings": {
            try {
              if (!conversationId) {
                throw new Error("No active conversation");
              }

              await storage.updateConversation(conversationId, {
                settings: message.payload.settings,
              });

              ws.send(
                JSON.stringify({
                  type: "settings_updated",
                  payload: { settings: message.payload.settings },
                })
              );
            } catch (error) {
              handleWebSocketError(ws, error);
            }
            break;
          }
          case "typing":
            try {
              // Broadcast typing status to all connected clients
              ws.send(JSON.stringify({ type: "typing" }));
            } catch (error) {
              handleWebSocketError(ws, error);
            }
            break;

          case "stop_typing":
            try {
              ws.send(JSON.stringify({ type: "stop_typing" }));
            } catch (error) {
              handleWebSocketError(ws, error);
            }
            break;
          default: {
            handleWebSocketError(ws, new Error(`Unknown message type: ${message.type}`));
          }
        }
      } catch (error) {
        handleWebSocketError(ws, error);
      }
    });
  });

  return httpServer;
}