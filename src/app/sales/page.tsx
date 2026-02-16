import ProductCatalog from "@/components/sales/ProductCatalog"
import Link from "next/link"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Sales</h1>
          <p className="text-gray-600 mt-2">Browse products and manage orders for WhatsApp customers</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/products">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Manage Products
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <ProductCatalog />
      </div>
    </div>
  )
}
