"use client"

import { useState } from "react"
import { ShoppingCart as CartIcon, Plus, Minus, MessageCircle } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

interface CartItem {
  id: number
  productId: number
  productName: string
  productImage?: string | null
  price: number
  quantity: number
}

interface ShoppingCartProps {
  cartItems: CartItem[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onSendOrder: (phoneNumber?: string) => void
  phoneNumber?: string
  requirePhoneNumber?: boolean
}

export default function ShoppingCart({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onSendOrder,
  phoneNumber,
  requirePhoneNumber = false,
}: ShoppingCartProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [orderPhoneNumber, setOrderPhoneNumber] = useState(phoneNumber || "")

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price / 100)
  }

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  const handleSendOrder = () => {
    if (requirePhoneNumber && !orderPhoneNumber) {
      toast.warning("Please enter a phone number to send the order.")
      return
    }
    onSendOrder(orderPhoneNumber || phoneNumber)
    setIsOpen(false)
    setOrderPhoneNumber("")
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <CartIcon className="h-4 w-4 mr-2" />
          Cart
          {getTotalItems() > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {getTotalItems()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {cartItems.length === 0 ? "Your cart is empty" : `${getTotalItems()} item(s) in cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
              <Image
                src={item.productImage || "/placeholder.svg"}
                alt={item.productName}
                width={60}
                height={60}
                className="rounded-md object-cover"
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.productName}</h4>
                <p className="text-sm text-gray-600">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (item.quantity > 1) {
                      onUpdateQuantity(item.productId, item.quantity - 1)
                    } else {
                      onRemoveItem(item.productId)
                    }
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {cartItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatPrice(getTotalPrice())}</span>
                </div>
                {requirePhoneNumber && !phoneNumber && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 555 123-4567"
                      value={orderPhoneNumber}
                      onChange={(e) => setOrderPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                )}
                <Button
                  onClick={handleSendOrder}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Order via WhatsApp
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

