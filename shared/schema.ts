import { pgTable, text, serial, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  status: text("status").notNull().default("active"),
  language: text("language").default("en"),
  summary: text("summary"),
  contextMemory: json("context_memory"),
  settings: json("settings").default({
    personality: "professional",
    voiceEnabled: false,
  }),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant, system
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  attachment: json("attachment").default(null),
  language: text("language"),
  sentiment: text("sentiment"),
  suggestions: json("suggestions"),
  needsHumanReview: boolean("needs_human_review").default(false),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  language: text("language").default("en"),
  category: text("category"),
});

export const mockCrmData = pgTable("mock_crm_data", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  details: json("details").notNull(),
  preferredLanguage: text("preferred_language"),
});

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const insertFaqSchema = createInsertSchema(faqs).pick({
  question: true,
  answer: true,
  language: true,
  category: true,
});
export const insertCrmDataSchema = createInsertSchema(mockCrmData);

// Types
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type FAQ = typeof faqs.$inferSelect;
export type CrmData = typeof mockCrmData.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertFAQ = z.infer<typeof insertFaqSchema>;
export type InsertCrmData = z.infer<typeof insertCrmDataSchema>;