import AppPromoCard from "@/components/app-promo-card"

export default function PromoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">🛒 Loja Online do Luizinho</h1>
          <p className="text-gray-600">Acesse nossa loja e faça seus pedidos pelo WhatsApp</p>
        </div>

        <AppPromoCard />

        <div className="text-sm text-gray-500 max-w-md mx-auto">
          <p>✨ Clique no botão acima para acessar nossa loja online completa</p>
          <p className="mt-2">📱 Escolha seus produtos e envie o pedido direto pelo WhatsApp</p>
        </div>
      </div>
    </div>
  )
}
