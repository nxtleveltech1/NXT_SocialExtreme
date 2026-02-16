"use client"

import { useState, useEffect } from "react"
import ProductCatalog from "@/components/sales/ProductCatalog"

export default function WhatsAppSalesClient({ conversationId }: { conversationId?: string }) {
  const [conversation, setConversation] = useState<any>(null)
  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(!!conversationId)

  useEffect(() => {
    if (conversationId) {
      fetchConversation()
    } else {
      setLoading(false)
    }
  }, [conversationId])

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/inbox/whatsapp-conversation?id=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setConversation(data.conversation)
        setChannel(data.channel)
      }
    } catch (error) {
      console.error("Error fetching conversation:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <>
      {conversation && (
        <p className="text-gray-600 mb-4">
          Customer: {conversation.userName || conversation.phoneNumber}
        </p>
      )}
      <ProductCatalog
        conversationId={conversationId ? parseInt(conversationId) : undefined}
        phoneNumber={conversation?.phoneNumber}
        channelId={channel?.id}
      />
    </>
  )
}

