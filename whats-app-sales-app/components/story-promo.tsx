"use client"

import { useState, useEffect } from "react"
import { MessageCircle, ShoppingCart, QrCode, ArrowRight } from "lucide-react"

export default function StoryPromo() {
  const appUrl = "https://v0-whats-app-sales-app-alpha.vercel.app/"
  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto-rotate slides like Instagram Stories
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearTimeout(timer)
  }, [currentSlide])

  // Progress indicators
  const ProgressIndicator = () => (
    <div className="flex space-x-1 absolute top-4 left-0 right-0 px-4">
      {[0, 1, 2].map((idx) => (
        <div
          key={idx}
          className="h-1 rounded-full flex-1 transition-all duration-300"
          style={{
            backgroundColor: idx === currentSlide ? "white" : "rgba(255,255,255,0.4)",
            opacity: idx === currentSlide ? 1 : 0.6,
          }}
        />
      ))}
    </div>
  )

  return (
    <div className="w-full max-w-md mx-auto h-[85vh] bg-gradient-to-b from-green-500 to-green-700 rounded-3xl overflow-hidden relative shadow-2xl">
      <ProgressIndicator />

      {/* Logo and Header */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <div className="text-green-600 font-bold text-3xl">L</div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Luizinho</h1>
            <p className="text-green-100">Eletrônicos</p>
          </div>
        </div>
      </div>

      {/* Slides */}
      <div className="h-full">
        {/* Slide 1 - Intro */}
        <div
          className={`h-full flex flex-col justify-center items-center px-8 transition-opacity duration-500 ${currentSlide === 0 ? "opacity-100" : "opacity-0 hidden"}`}
        >
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-white">Acessórios Tech</h2>
            <p className="text-xl text-green-100">Os melhores produtos para seu dispositivo</p>

            <div className="py-6">
              <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-10 w-10 text-white" />
              </div>
            </div>

            <p className="text-white text-lg font-medium">Deslize para ver mais</p>
            <ArrowRight className="h-6 w-6 text-white mx-auto animate-bounce" />
          </div>
        </div>

        {/* Slide 2 - Products */}
        <div
          className={`h-full flex flex-col justify-center items-center px-6 transition-opacity duration-500 ${currentSlide === 1 ? "opacity-100" : "opacity-0 hidden"}`}
        >
          <h2 className="text-3xl font-bold text-white mb-6">Produtos Disponíveis</h2>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🎧</div>
              <div className="text-white font-medium">Fones Bluetooth</div>
              <div className="text-green-100 font-bold">R$ 299,99</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🔌</div>
              <div className="text-white font-medium">Carregadores</div>
              <div className="text-green-100 font-bold">R$ 89,99</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🔗</div>
              <div className="text-white font-medium">Cabos USB-C</div>
              <div className="text-green-100 font-bold">R$ 49,99</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🔋</div>
              <div className="text-white font-medium">Power Banks</div>
              <div className="text-green-100 font-bold">R$ 159,99</div>
            </div>
          </div>
        </div>

        {/* Slide 3 - CTA */}
        <div
          className={`h-full flex flex-col justify-center items-center px-8 transition-opacity duration-500 ${currentSlide === 2 ? "opacity-100" : "opacity-0 hidden"}`}
        >
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">Faça seu pedido agora!</h2>

            <div className="bg-white p-4 rounded-xl">
              <div className="bg-green-100 p-3 rounded-lg mb-4">
                <QrCode className="h-48 w-48 mx-auto text-green-700" />
              </div>
              <p className="text-green-700 font-medium">Escaneie para acessar</p>
            </div>

            <div className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full py-3 px-6">
              <MessageCircle className="h-5 w-5 text-white" />
              <span className="text-white font-medium">Pedidos via WhatsApp</span>
            </div>

            <p className="text-green-100 text-sm">https://v0-whats-app-sales-app-alpha.vercel.app/</p>
          </div>
        </div>
      </div>

      {/* Swipe indicators */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-3 h-3 rounded-full ${currentSlide === idx ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  )
}
