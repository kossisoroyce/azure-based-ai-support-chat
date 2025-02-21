import {
  type Conversation,
  type Message,
  type FAQ,
  type CrmData,
  type InsertConversation,
  type InsertMessage,
  type InsertFAQ,
  type InsertCrmData,
} from "@shared/schema";

interface PopularSearch {
  query: string;
  count: number;
  timestamp: Date;
}

export interface IStorage {
  // Conversations
  createConversation(data: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation>;

  // Messages
  createMessage(data: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;

  // FAQs
  createFAQ(data: InsertFAQ): Promise<FAQ>;
  getFAQs(language?: string): Promise<FAQ[]>;
  updateFAQ(id: number, data: Partial<InsertFAQ>): Promise<FAQ>;
  deleteFAQ(id: number): Promise<void>;

  // CRM
  getCrmData(customerId: string): Promise<CrmData | undefined>;
  createCrmData(data: InsertCrmData): Promise<CrmData>;

  trackSearch(query: string): Promise<void>;
  getPopularSearches(limit?: number): Promise<{ query: string; count: number }[]>;
}

export class MemStorage implements IStorage {
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private faqs: Map<number, FAQ>;
  private crmData: Map<string, CrmData>;
  private popularSearches: PopularSearch[];
  private currentIds: {
    conversation: number;
    message: number;
    faq: number;
    crm: number;
  };

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.faqs = new Map();
    this.crmData = new Map();
    this.popularSearches = [];
    this.currentIds = {
      conversation: 1,
      message: 1,
      faq: 1,
      crm: 1,
    };
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const id = this.currentIds.conversation++;
    const conversation: Conversation = {
      ...data,
      id,
      status: data.status || "active",
      language: data.language || "en",
      summary: null,
      contextMemory: {},
      settings: data.settings || {},
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const updated = { ...conversation, ...data };
    this.conversations.set(id, updated);
    return updated;
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const id = this.currentIds.message++;
    const message: Message = {
      ...data,
      id,
      timestamp: new Date(),
      language: data.language || "en",
      sentiment: null,
      attachment: data.attachment || null,
      suggestions: data.suggestions || null,
      needsHumanReview: data.needsHumanReview || false,
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (m) => m.conversationId === conversationId,
    );
  }

  async createFAQ(data: InsertFAQ): Promise<FAQ> {
    const id = this.currentIds.faq++;
    const faq: FAQ = {
      ...data,
      id,
      enabled: true,
      language: data.language || "en",
      category: data.category || null,
    };
    this.faqs.set(id, faq);
    return faq;
  }

  async getFAQs(language?: string): Promise<FAQ[]> {
    const faqs = Array.from(this.faqs.values());
    if (language) {
      return faqs.filter(faq => !faq.language || faq.language === language);
    }
    return faqs;
  }

  async updateFAQ(id: number, data: Partial<InsertFAQ>): Promise<FAQ> {
    const faq = this.faqs.get(id);
    if (!faq) throw new Error("FAQ not found");
    const updated = { ...faq, ...data };
    this.faqs.set(id, updated);
    return updated;
  }

  async deleteFAQ(id: number): Promise<void> {
    this.faqs.delete(id);
  }

  async getCrmData(customerId: string): Promise<CrmData | undefined> {
    return this.crmData.get(customerId);
  }

  async createCrmData(data: InsertCrmData): Promise<CrmData> {
    const id = this.currentIds.crm++;
    const crmData: CrmData = {
      ...data,
      id,
      preferredLanguage: data.preferredLanguage || "en",
    };
    this.crmData.set(data.customerId, crmData);
    return crmData;
  }

  async trackSearch(query: string): Promise<void> {
    const existingSearch = this.popularSearches.find(s => s.query.toLowerCase() === query.toLowerCase());

    if (existingSearch) {
      existingSearch.count++;
      existingSearch.timestamp = new Date();
    } else {
      this.popularSearches.push({
        query,
        count: 1,
        timestamp: new Date(),
      });
    }

    // Keep only searches from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.popularSearches = this.popularSearches.filter(s => s.timestamp > oneDayAgo);
  }

  async getPopularSearches(limit: number = 5): Promise<{ query: string; count: number }[]> {
    return this.popularSearches
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ query, count }) => ({ query, count }));
  }
}

export const storage = new MemStorage();

// Initialize some mock CRM data
storage.createCrmData({
  customerId: "CUST001",
  name: "John Doe",
  email: "john@example.com",
  details: {
    plan: "Premium",
    signupDate: "2024-01-15",
    lastPurchase: "2024-03-20",
  },
  preferredLanguage: "en",
});

// Initialize some FAQs
storage.createFAQ({
  question: "How do I reset my password?",
  answer: "You can reset your password by clicking the 'Forgot Password' link on the login page and following the instructions sent to your email.",
  language: "en",
  category: "account",
});

storage.createFAQ({
  question: "What payment methods do you accept?",
  answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers.",
  language: "en",
  category: "billing",
});