"use client"

import { MessageCircle, ShoppingCart, Smartphone, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AppPromoCard() {
  const appUrl = "https://v0-whats-app-sales-app-alpha.vercel.app/"

  const openApp = () => {
    window.open(appUrl, "_blank")
  }

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm p-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <div className="text-green-600 font-bold text-xl">L</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Luizinho</h1>
            <p className="text-green-100 text-sm">Loja de Eletrônicos</p>
          </div>
        </div>
        <Badge className="bg-yellow-400 text-green-800 font-semibold">🔥 Produtos em Destaque</Badge>
      </div>

      {/* Content */}
      <div className="p-6 text-white">
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-5 w-5 text-green-200" />
            <span className="text-sm">Catálogo completo de produtos</span>
          </div>
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-5 w-5 text-green-200" />
            <span className="text-sm">Pedidos direto pelo WhatsApp</span>
          </div>
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-green-200" />
            <span className="text-sm">Acesso fácil e rápido</span>
          </div>
        </div>

        {/* Featured Products Preview */}
        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-center">Produtos Disponíveis:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/20 rounded p-2 text-center">
              <div>🎧 Fones Bluetooth</div>
              <div className="text-green-200">R$ 299,99</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div>🔌 Carregadores</div>
              <div className="text-green-200">R$ 89,99</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div>🔗 Cabos USB-C</div>
              <div className="text-green-200">R$ 49,99</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div>🔋 Power Banks</div>
              <div className="text-green-200">R$ 159,99</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <Button
          onClick={openApp}
          className="w-full bg-white text-green-700 hover:bg-green-50 font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-105"
          size="lg"
        >
          <Smartphone className="h-5 w-5 mr-2" />
          Abrir Loja Online
        </Button>

        {/* URL Display */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <QrCode className="h-4 w-4 text-green-200" />
              <span className="text-xs text-green-100">Link direto:</span>
            </div>
          </div>
          <div className="text-xs text-white font-mono mt-1 break-all">{appUrl}</div>
        </div>

        {/* WhatsApp Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-green-100">📱 Faça seu pedido e receba via WhatsApp</p>
          <p className="text-xs text-green-200 font-semibold">Entrega rápida • Produtos originais</p>
        </div>
      </div>
    </div>
  )
}
