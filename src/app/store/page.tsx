"use client"

import { useState } from "react"
import { ShoppingCart, Plus, Minus, MessageCircle, Phone, Eye } from "lucide-react"
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
  image: string
  description: string
  category: string
  features: string[]
  specifications: Record<string, string>
}

interface CartItem extends Product {
  quantity: number
}

const products: Product[] = [
  {
    id: 1,
    name: "Fone de Ouvido Bluetooth Premium",
    price: 299.99,
    image: "/images/fone-bluetooth-premium.jpg",
    description: "Fone de ouvido sem fio com cancelamento de ruído ativo e bateria de longa duração.",
    category: "Áudio",
    features: ["Bluetooth 5.0", "Cancelamento de ruído", "30h de bateria", "Resistente à água IPX4"],
    specifications: { Conectividade: "Bluetooth 5.0", Bateria: "30 horas", Resistência: "IPX4", Peso: "250g", Garantia: "1 ano" },
  },
  {
    id: 2,
    name: "Carregador Rápido USB-C 65W",
    price: 89.99,
    image: "/images/carregador-usb-c.jpg",
    description: "Carregador rápido universal compatível com smartphones, tablets e notebooks.",
    category: "Carregadores",
    features: ["Carregamento rápido 65W", "USB-C PD", "Proteção contra sobrecarga", "Compacto e portátil"],
    specifications: { Potência: "65W", Entrada: "100-240V", Saída: "USB-C PD", Dimensões: "6x6x3cm", Garantia: "2 anos" },
  },
  {
    id: 3,
    name: "Cabo USB-C Original 2m",
    price: 49.99,
    image: "/images/cabo-usb-c.jpg",
    description: "Cabo USB-C original de alta qualidade para carregamento e transferência de dados.",
    category: "Cabos",
    features: ["2 metros de comprimento", "USB-C para USB-C", "Transferência rápida", "Material durável"],
    specifications: { Comprimento: "2 metros", Tipo: "USB-C para USB-C", Velocidade: "480 Mbps", Material: "Nylon trançado", Garantia: "1 ano" },
  },
  {
    id: 4,
    name: "Carregador de Indução Wireless 15W",
    price: 129.99,
    image: "/images/carregador-wireless.jpg",
    description: "Base de carregamento sem fio compatível com todos os dispositivos Qi.",
    category: "Carregadores",
    features: ["Carregamento 15W", "Compatível Qi", "LED indicador", "Design elegante"],
    specifications: { Potência: "15W máximo", Compatibilidade: "Qi universal", Dimensões: "10x10x1cm", Material: "Alumínio premium", Garantia: "2 anos" },
  },
  {
    id: 5,
    name: "Fone de Ouvido Gaming RGB",
    price: 199.99,
    image: "/images/fone-gaming.jpg",
    description: "Headset gamer com iluminação RGB e microfone destacável. Som surround.",
    category: "Áudio",
    features: ["Som surround 7.1", "Microfone destacável", "Iluminação RGB", "Almofadas confortáveis"],
    specifications: { Conectividade: "USB + P2", Drivers: "50mm", Frequência: "20Hz-20kHz", Peso: "320g", Garantia: "1 ano" },
  },
  {
    id: 6,
    name: "Carregador Portátil 20000mAh",
    price: 159.99,
    image: "/images/power-bank.jpg",
    description: "Power bank de alta capacidade com carregamento rápido e múltiplas portas.",
    category: "Carregadores",
    features: ["20000mAh", "Carregamento rápido", "3 portas USB", "Display digital"],
    specifications: { Capacidade: "20000mAh", Portas: "2x USB-A + 1x USB-C", Entrada: "USB-C 18W", Saída: "22.5W máximo", Garantia: "1 ano" },
  },
]

export default function StorePage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productQuantity, setProductQuantity] = useState(1)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

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
    if (cart.length === 0) return
    let message = "*Olá! Gostaria de fazer um pedido:*\n\n"
    cart.forEach((item, i) => {
      message += `${i + 1}. *${item.name}*\n`
      message += `   Quantidade: ${item.quantity}\n`
      message += `   Preço unitário: R$ ${item.price.toFixed(2)}\n`
      message += `   Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}\n\n`
    })
    message += `*Total: R$ ${totalPrice.toFixed(2)}*\n\n`
    message += "Aguardo confirmação e informações sobre entrega!"
    window.open(`https://wa.me/5511932162209?text=${encodeURIComponent(message)}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Phone className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-green-600">Luizinho</h1>
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
                        <p className="text-sm text-gray-600">R$ {item.price.toFixed(2)}</p>
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
                          <span>R$ {totalPrice.toFixed(2)}</span>
                        </div>
                        <Button onClick={sendWhatsAppMessage} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Send Order via WhatsApp
                        </Button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <Image src={product.image || "/placeholder.svg"} alt={product.name} width={400} height={300} className="w-full h-48 object-cover" />
                <Badge className="absolute top-2 left-2">{product.category}</Badge>
              </div>

              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {product.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">{feature}</Badge>
                    ))}
                    {product.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{product.features.length - 3} more</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">R$ {product.price.toFixed(2)}</span>
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
                  <Badge className="w-fit">{selectedProduct.category}</Badge>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Features</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProduct.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="justify-start">{feature}</Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

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

                  <Separator />

                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-green-600">R$ {selectedProduct.price.toFixed(2)}</div>

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
                        R$ {(selectedProduct.price * productQuantity).toFixed(2)}
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
          <h3 className="text-lg font-semibold mb-2">TechStore - Your electronics store</h3>
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
