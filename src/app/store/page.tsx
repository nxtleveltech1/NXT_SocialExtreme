"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, Plus, Minus, MessageCircle, Phone, Eye, Loader2 } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface Product {
  id: number
  name: string
  price: number
  image: string | null
  description: string | null
  category: string | null
  features: string[]
  specifications: Record<string, string>
  currency?: string
}

interface CartItem extends Product {
  quantity: number
}

interface Channel {
  id: number
  name: string
  platform: string
  handle: string
  isConnected: boolean | null
}

const currencyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productQuantity, setProductQuantity] = useState(1)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch products
        const productsResponse = await fetch("/api/sales/products")
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          // Map API response to Product interface, converting price from cents
          const mappedProducts: Product[] = (Array.isArray(productsData) ? productsData : []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price / 100, // Convert from cents to display value
            image: p.image || null,
            description: p.description || null,
            category: p.category || null,
            features: Array.isArray(p.features) ? p.features : [],
            specifications: p.specifications || {},
            currency: p.currency || 'ZAR',
          }))
          setProducts(mappedProducts)
        }

        // Fetch WhatsApp channel
        const channelsResponse = await fetch("/api/channels")
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json()
          const channels: Channel[] = Array.isArray(channelsData) 
            ? channelsData 
            : channelsData.channels || []
          
          // Find first connected WhatsApp channel
          const whatsappChannel = channels.find(
            (c: Channel) => c.platform === 'whatsapp' && c.isConnected === true
          )
          
          if (whatsappChannel) {
            setWhatsappNumber(whatsappChannel.handle)
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const openProductModal = (product: Product) => {
    setSelectedProduct(product)
    setProductQuantity(1)
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setSelectedProduct(null)
    setProductQuantity(1)
  }

  const addToCartFromModal = () => {
    if (!selectedProduct) return
    setCart((prev) => {
      const existing = prev.find((item) => item.id === selectedProduct.id)
      if (existing) {
        return prev.map((item) =>
          item.id === selectedProduct.id ? { ...item, quantity: item.quantity + productQuantity } : item,
        )
      }
      return [...prev, { ...selectedProduct, quantity: productQuantity }]
    })
    closeProductModal()
  }

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
      }
      return prev.filter((item) => item.id !== productId)
    })
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const sendWhatsAppMessage = () => {
    if (cart.length === 0 || !whatsappNumber) return
    let message = "*Hello! I would like to place an order:*\n\n"
    cart.forEach((item, i) => {
      message += `${i + 1}. *${item.name}*\n`
      message += `   Quantity: ${item.quantity}\n`
      message += `   Unit price: ${currencyFormatter.format(item.price)}\n`
      message += `   Subtotal: ${currencyFormatter.format(item.price * item.quantity)}\n\n`
    })
    message += `*Total: ${currencyFormatter.format(totalPrice)}*\n\n`
    message += "Awaiting confirmation and delivery information!"
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Phone className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-green-600">Store</h1>
            </div>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                  {totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Shopping Cart</SheetTitle>
                  <SheetDescription>
                    {cart.length === 0 ? "Your cart is empty" : `${totalItems} item(s) in cart`}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} width={60} height={60} className="rounded-md object-cover" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-sm text-gray-600">{currencyFormatter.format(item.price)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.id)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => addToCart(item)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {cart.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex justify-between items-center font-bold text-lg">
                          <span>Total:</span>
                          <span>{currencyFormatter.format(totalPrice)}</span>
                        </div>
                        <Button 
                          onClick={sendWhatsAppMessage} 
                          className="w-full bg-green-600 hover:bg-green-700" 
                          size="lg"
                          disabled={!whatsappNumber}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Send Order via WhatsApp
                        </Button>
                        {!whatsappNumber && (
                          <p className="text-sm text-gray-500 text-center">WhatsApp channel not connected</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600">Find the best electronic accessories with guaranteed quality</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <Image src={product.image || "/placeholder.svg"} alt={product.name} width={400} height={300} className="w-full h-48 object-cover" />
                  {product.category && (
                    <Badge className="absolute top-2 left-2">{product.category}</Badge>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription>{product.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {product.features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">{feature}</Badge>
                        ))}
                        {product.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{product.features.length - 3} more</Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">{currencyFormatter.format(product.price)}</span>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openProductModal(product)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button onClick={() => addToCart(product)} className="bg-green-600 hover:bg-green-700" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProduct.name}</DialogTitle>
                <DialogDescription>{selectedProduct.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-4">
                  <Image src={selectedProduct.image || "/placeholder.svg"} alt={selectedProduct.name} width={400} height={400} className="w-full rounded-lg object-cover" />
                  {selectedProduct.category && (
                    <Badge className="w-fit">{selectedProduct.category}</Badge>
                  )}
                </div>

                <div className="space-y-6">
                  {selectedProduct.features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Features</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.features.map((feature) => (
                          <Badge key={feature} variant="secondary" className="justify-start">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.features.length > 0 && Object.keys(selectedProduct.specifications).length > 0 && (
                    <Separator />
                  )}

                  {Object.keys(selectedProduct.specifications).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                      <div className="space-y-2">
                        {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span className="text-gray-600">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-green-600">{currencyFormatter.format(selectedProduct.price)}</div>

                    <div className="flex items-center space-x-4">
                      <span className="font-medium">Quantity:</span>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{productQuantity}</span>
                        <Button variant="outline" size="icon" onClick={() => setProductQuantity(productQuantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Subtotal:</span>
                      <span className="text-xl font-bold text-green-600">
                        {currencyFormatter.format(selectedProduct.price * productQuantity)}
                      </span>
                    </div>

                    <Button onClick={addToCartFromModal} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add {productQuantity} to Cart
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Store - Your electronics store</h3>
          <p className="text-gray-400 mb-4">Quality products with fast delivery</p>
          <div className="flex justify-center items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            <span>Contact us via WhatsApp for questions</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
