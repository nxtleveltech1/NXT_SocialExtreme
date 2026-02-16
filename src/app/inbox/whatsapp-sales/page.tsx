import WhatsAppSalesClient from "./client"
import Link from "next/link"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function WhatsAppSalesPage({
  searchParams,
}: {
  searchParams: { conversationId?: string }
}) {
  const conversationId = searchParams.conversationId

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {conversationId && (
            <Link href={`/inbox?conversationId=${conversationId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inbox
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Store</h1>
            <p className="text-gray-600 mt-2">Choose products and send orders directly via WhatsApp</p>
          </div>
        </div>
        <Link href="/sales">
          <Button variant="outline">
            <ShoppingBag className="h-4 w-4 mr-2" />
            View All Products
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <WhatsAppSalesClient conversationId={conversationId} />
      </div>
    </div>
  )
}

