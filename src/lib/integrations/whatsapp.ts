import { z } from 'zod';

// WhatsApp API types
const WhatsAppMessageSchema = z.object({
  to: z.string(),
  type: z.enum(['text', 'image', 'video', 'document', 'template', 'interactive']),
  interactive: z.record(z.string(), z.unknown()).optional(),
  text: z.object({
    body: z.string(),
  }).optional(),
  template: z.object({
    name: z.string(),
    language: z.object({
      code: z.string(),
    }),
    components: z.array(z.any()).optional(),
  }).optional(),
  image: z.object({
    link: z.string(),
    caption: z.string().optional(),
  }).optional(),
  video: z.object({
    link: z.string(),
    caption: z.string().optional(),
  }).optional(),
  document: z.object({
    link: z.string(),
    filename: z.string().optional(),
  }).optional(),
});

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  apiUrl: string;
}

export class WhatsAppIntegration {
  private config: WhatsAppConfig;
  private messageQueue: Map<string, any[]> = new Map();

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async sendMessage(messageData: any): Promise<any> {
    try {
      const validatedMessage = WhatsAppMessageSchema.parse(messageData);

      const response = await fetch(`${this.config.apiUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: validatedMessage.to,
          type: validatedMessage.type,
          [validatedMessage.type]: (validatedMessage as Record<string, unknown>)[validatedMessage.type],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return { success: true, messageId: result.messages?.[0]?.id };
      } else {
        throw new Error(result.error?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string, components?: any[]): Promise<any> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components || [],
      },
    });
  }

  async sendTextMessage(to: string, text: string): Promise<any> {
    return this.sendMessage({
      to,
      type: 'text',
      text: { body: text },
    });
  }

  async sendMediaMessage(to: string, type: 'image' | 'video' | 'document', mediaUrl: string, caption?: string): Promise<any> {
    const mediaData: any = { link: mediaUrl };
    if (caption) mediaData.caption = caption;

    return this.sendMessage({
      to,
      type,
      [type]: mediaData,
    });
  }

  async processWebhook(event: any): Promise<void> {
    try {
      console.log('Processing WhatsApp webhook:', event);

      if (event.entry && event.entry[0]?.changes?.[0]?.value?.messages) {
        const messages = event.entry[0].changes[0].value.messages;

        for (const message of messages) {
          await this.handleIncomingMessage(message);
        }
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    // Store message in database
    // Trigger appropriate responses based on message type
    console.log('Handling incoming message:', message);
  }

  queueMessage(messageData: any): void {
    const queueKey = `${messageData.to}_${Date.now()}`;
    this.messageQueue.set(queueKey, [messageData]);
  }

  async processQueue(): Promise<void> {
    for (const [key, messages] of this.messageQueue.entries()) {
      for (const message of messages) {
        await this.sendMessage(message);
      }
      this.messageQueue.delete(key);
    }
  }

  verifyWebhook(token: string): boolean {
    return token === this.config.webhookVerifyToken;
  }
}

// Multi-provider WhatsApp integration
export class WhatsAppMultiProvider {
  private providers: Map<string, WhatsAppIntegration> = new Map();

  addProvider(providerName: string, config: WhatsAppConfig): void {
    this.providers.set(providerName, new WhatsAppIntegration(config));
  }

  async sendToProvider(providerName: string, messageData: any): Promise<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not configured`);
    }
    return provider.sendMessage(messageData);
  }

  async sendToAllProviders(messageData: any): Promise<any[]> {
    const results: any[] = [];
    for (const [name, provider] of this.providers.entries()) {
      try {
        const result = await provider.sendMessage(messageData);
        results.push({ provider: name, result });
      } catch (error) {
        results.push({ provider: name, error: (error as Error).message });
      }
    }
    return results;
  }
}