"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import ProductCard from "./ProductCard"
import ShoppingCart from "./ShoppingCart"

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

interface CartItem {
  id: number
  productId: number
  productName: string
  productImage?: string | null
  price: number
  quantity: number
}

interface ProductCatalogProps {
  conversationId?: number
  phoneNumber?: string
  channelId?: number
}

export default function ProductCatalog({ conversationId, phoneNumber, channelId }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
    if (conversationId) {
      fetchCart()
    }
  }, [conversationId])

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/sales/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCart = async () => {
    if (!conversationId) return
    try {
      const response = await fetch(`/api/sales/cart?conversationId=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    }
  }

  const handleAddToCart = async (product: Product) => {
    if (!conversationId) {
      // If no conversation, create a local cart
      setCartItems((prev) => {
        const existing = prev.find((item) => item.productId === product.id)
        if (existing) {
          return prev.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        return [
          ...prev,
          {
            id: Date.now(),
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            price: product.price,
            quantity: 1,
          },
        ]
      })
      return
    }

    try {
      const response = await fetch("/api/sales/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          productId: product.id,
          quantity: 1,
        }),
      })
      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
    }
  }

  const handleUpdateQuantity = async (productId: number, quantity: number) => {
    if (!conversationId) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      )
      return
    }

    try {
      const response = await fetch("/api/sales/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          productId,
          quantity,
        }),
      })
      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error("Error updating cart:", error)
    }
  }

  const handleRemoveItem = async (productId: number) => {
    if (!conversationId) {
      setCartItems((prev) => prev.filter((item) => item.productId !== productId))
      return
    }

    try {
      const response = await fetch("/api/sales/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          productId,
        }),
      })
      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error("Error removing from cart:", error)
    }
  }

  const handleSendOrder = async (orderPhoneNumber?: string) => {
    if (cartItems.length === 0) return

    const finalPhoneNumber = orderPhoneNumber || phoneNumber
    if (!finalPhoneNumber && !conversationId) {
      toast.warning("Please provide a phone number to send the order.")
      return
    }

    try {
      const response = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          phoneNumber: finalPhoneNumber,
          channelId,
          cartItems,
        }),
      })

      if (response.ok) {
        const order = await response.json()
        // Clear cart
        setCartItems([])
        if (conversationId) {
          await fetchCart()
        }
        toast.success("Order sent successfully via WhatsApp!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Error sending order. Please try again.")
      }
    } catch (error) {
      console.error("Error sending order:", error)
      toast.error("Error sending order. Please try again.")
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Products</h2>
          <p className="text-lg text-gray-600">Find the best products with guaranteed quality</p>
        </div>
        <ShoppingCart
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onSendOrder={handleSendOrder}
          phoneNumber={phoneNumber}
          requirePhoneNumber={!conversationId && !phoneNumber}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No products available at the moment.</p>
        </div>
      )}
    </div>
  )
}

