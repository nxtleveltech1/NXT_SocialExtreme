-- Enhanced Channel Integrations Migration
-- Adds comprehensive channel management and integration capabilities

-- 1. Enhanced Channel Schema
ALTER TABLE channels ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'meta';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS provider_channel_id VARCHAR(255);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_webhook_event TIMESTAMP;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rate_limit_remaining INTEGER;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rate_limit_reset TIMESTAMP;

-- 2. Channel Webhook Events
CREATE TABLE IF NOT EXISTS channel_webhook_events (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Channel Message Queues
CREATE TABLE IF NOT EXISTS channel_message_queue (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    scheduled_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Channel Metrics Tracking
CREATE TABLE IF NOT EXISTS channel_metrics (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value INTEGER,
    metric_data JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- 5. Channel Health Monitoring
CREATE TABLE IF NOT EXISTS channel_health (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    last_check TIMESTAMP DEFAULT NOW(),
    response_time INTEGER, -- milliseconds
    error_details JSONB,
    uptime_percentage DECIMAL(5,2)
);

-- 6. WhatsApp Specific Enhancements
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS template_messages JSONB;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_id VARCHAR(100);
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS interactive_type VARCHAR(50);

-- 7. Production System Integration
CREATE TABLE IF NOT EXISTS production_integrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    auth_type VARCHAR(20) DEFAULT 'api_key',
    auth_config JSONB,
    enabled BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Integration Webhooks
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id SERIAL PRIMARY KEY,
    integration_id INTEGER REFERENCES production_integrations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Message Templates for Channels
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    template_content JSONB NOT NULL,
    variables JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Channel Rate Limiting
CREATE TABLE IF NOT EXISTS channel_rate_limits (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    limit_type VARCHAR(50) NOT NULL,
    limit_value INTEGER NOT NULL,
    current_usage INTEGER DEFAULT 0,
    reset_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_channel_webhook_events_channel_id ON channel_webhook_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_webhook_events_status ON channel_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_channel_id ON channel_message_queue(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_status ON channel_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_channel_id ON channel_metrics(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_recorded_at ON channel_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_production_integrations_provider ON production_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration_id ON integration_webhooks(integration_id);
