"use client"

import { useState } from "react"
import { Plus, Eye } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface Product {
  id: number
  name: string
  price: number
  image?: string | null
  description?: string | null
  category?: string | null
  features?: string[] | null
  specifications?: Record<string, string> | null
}

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
  onViewDetails?: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price / 100)
  }

  const handleViewDetails = () => {
    setIsModalOpen(true)
    onViewDetails?.(product)
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative group">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            width={400}
            height={300}
            className="w-full h-48 object-cover"
          />
          {product.category && (
            <Badge className="absolute top-2 left-2">{product.category}</Badge>
          )}
        </div>

        <CardHeader>
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <CardDescription>{product.description || ""}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {product.features && product.features.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.features.slice(0, 3).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {product.features.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{product.features.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleViewDetails}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button onClick={() => onAddToCart(product)} className="bg-green-600 hover:bg-green-700" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
            <DialogDescription>{product.description || ""}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="relative group">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="w-full rounded-lg object-cover"
                />
              </div>
              {product.category && (
                <Badge className="w-fit">{product.category}</Badge>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              {product.features && product.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Features</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {product.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="justify-start">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                    <div className="space-y-2">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span className="text-gray-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Price */}
              <div className="space-y-4">
                <div className="text-3xl font-bold text-green-600">{formatPrice(product.price)}</div>
                <Button 
                  onClick={() => {
                    onAddToCart(product)
                    setIsModalOpen(false)
                  }} 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

