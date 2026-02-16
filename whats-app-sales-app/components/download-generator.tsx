"use client"

import { useState } from "react"
import { Download, ImageIcon, FileText, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DownloadGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)

  // Função para gerar e baixar a imagem promocional
  const generatePromoImage = async (format: "square" | "story" | "banner") => {
    setIsGenerating(true)

    try {
      // Criar canvas para gerar a imagem
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      // Definir dimensões baseadas no formato
      const dimensions = {
        square: { width: 1080, height: 1080 },
        story: { width: 1080, height: 1920 },
        banner: { width: 1200, height: 630 },
      }

      const { width, height } = dimensions[format]
      canvas.width = width
      canvas.height = height

      // Criar gradiente de fundo
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, "#10b981")
      gradient.addColorStop(1, "#059669")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Configurar texto
      ctx.textAlign = "center"
      ctx.fillStyle = "white"

      if (format === "story") {
        // Layout para Stories
        // Logo
        ctx.fillStyle = "white"
        ctx.fillRect(width / 2 - 80, 150, 160, 160)
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 80px Arial"
        ctx.fillText("L", width / 2, 260)

        // Título
        ctx.fillStyle = "white"
        ctx.font = "bold 60px Arial"
        ctx.fillText("Luizinho", width / 2, 380)
        ctx.font = "40px Arial"
        ctx.fillText("Loja de Eletrônicos", width / 2, 430)

        // Produtos
        ctx.font = "bold 45px Arial"
        ctx.fillText("Produtos Disponíveis:", width / 2, 600)

        const products = [
          "🎧 Fones Bluetooth - R$ 299,99",
          "🔌 Carregadores - R$ 89,99",
          "🔗 Cabos USB-C - R$ 49,99",
          "🔋 Power Banks - R$ 159,99",
        ]

        ctx.font = "35px Arial"
        products.forEach((product, index) => {
          ctx.fillText(product, width / 2, 700 + index * 80)
        })

        // Call to action
        ctx.font = "bold 50px Arial"
        ctx.fillText("Acesse nossa loja online!", width / 2, 1200)

        // URL
        ctx.font = "30px Arial"
        ctx.fillText("v0-whats-app-sales-app-alpha.vercel.app", width / 2, 1300)

        // WhatsApp info
        ctx.font = "35px Arial"
        ctx.fillText("📱 Pedidos via WhatsApp", width / 2, 1450)
        ctx.fillText("Entrega rápida • Produtos originais", width / 2, 1500)
      } else if (format === "square") {
        // Layout para post quadrado
        // Logo
        ctx.fillStyle = "white"
        ctx.fillRect(width / 2 - 60, 100, 120, 120)
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 60px Arial"
        ctx.fillText("L", width / 2, 180)

        // Título
        ctx.fillStyle = "white"
        ctx.font = "bold 50px Arial"
        ctx.fillText("Luizinho - Eletrônicos", width / 2, 280)

        // Grid de produtos
        const productGrid = [
          ["🎧 Fones", "R$ 299,99"],
          ["🔌 Carregadores", "R$ 89,99"],
          ["🔗 Cabos", "R$ 49,99"],
          ["🔋 Power Banks", "R$ 159,99"],
        ]

        ctx.font = "30px Arial"
        productGrid.forEach((product, index) => {
          const x = (index % 2) * (width / 2) + width / 4
          const y = Math.floor(index / 2) * 150 + 450
          ctx.fillText(product[0], x, y)
          ctx.fillText(product[1], x, y + 40)
        })

        // Call to action
        ctx.font = "bold 40px Arial"
        ctx.fillText("Acesse nossa loja online!", width / 2, 800)

        // URL
        ctx.font = "25px Arial"
        ctx.fillText("v0-whats-app-sales-app-alpha.vercel.app", width / 2, 850)
      } else {
        // Layout para banner
        // Logo à esquerda
        ctx.fillStyle = "white"
        ctx.fillRect(50, height / 2 - 60, 120, 120)
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 60px Arial"
        ctx.textAlign = "center"
        ctx.fillText("L", 110, height / 2 + 20)

        // Título
        ctx.fillStyle = "white"
        ctx.font = "bold 45px Arial"
        ctx.textAlign = "left"
        ctx.fillText("Luizinho - Loja de Eletrônicos", 200, height / 2 - 80)

        // Produtos
        ctx.font = "30px Arial"
        ctx.fillText("🎧 Fones • 🔌 Carregadores • 🔗 Cabos • 🔋 Power Banks", 200, height / 2 - 30)

        // Call to action
        ctx.font = "bold 35px Arial"
        ctx.fillText("Acesse: v0-whats-app-sales-app-alpha.vercel.app", 200, height / 2 + 30)

        // WhatsApp
        ctx.font = "25px Arial"
        ctx.fillText("📱 Pedidos via WhatsApp • Entrega rápida", 200, height / 2 + 70)
      }

      // Converter canvas para blob e fazer download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `luizinho-promo-${format}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, "image/png")
    } catch (error) {
      console.error("Erro ao gerar imagem:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Função para gerar arquivo de texto com informações
  const generateTextFile = () => {
    const content = `
🛒 LOJA ONLINE DO LUIZINHO
Eletrônicos e Acessórios

📱 ACESSE NOSSA LOJA:
https://v0-whats-app-sales-app-alpha.vercel.app/

🎯 PRODUTOS DISPONÍVEIS:
• 🎧 Fones de Ouvido Bluetooth Premium - R$ 299,99
• 🔌 Carregador Rápido USB-C 65W - R$ 89,99
• 🔗 Cabo USB-C Original 2m - R$ 49,99
• 📱 Carregador de Indução Wireless 15W - R$ 129,99
• 🎮 Fone de Ouvido Gaming RGB - R$ 199,99
• 🔋 Carregador Portátil 20000mAh - R$ 159,99

📞 COMO FAZER PEDIDOS:
1. Acesse nossa loja online
2. Escolha seus produtos
3. Adicione ao carrinho
4. Envie o pedido via WhatsApp

✅ VANTAGENS:
• Produtos originais
• Entrega rápida
• Atendimento via WhatsApp
• Preços competitivos
• Qualidade garantida

📲 CONTATO:
WhatsApp: (11) 93216-2209

🌐 COMPARTILHE:
Envie este link para seus amigos:
https://v0-whats-app-sales-app-alpha.vercel.app/

---
Luizinho - Sua loja de eletrônicos de confiança
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "luizinho-loja-info.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-800">Material Promocional para Download</h1>
        <p className="text-gray-600">Baixe imagens e arquivos para compartilhar a loja do Luizinho</p>
      </div>

      {/* Imagens Promocionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Imagens Promocionais</span>
          </CardTitle>
          <CardDescription>Baixe imagens otimizadas para diferentes plataformas e usos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Post Quadrado */}
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="w-full h-32 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <div className="text-white font-bold text-2xl">1:1</div>
              </div>
              <div>
                <h3 className="font-semibold">Post Quadrado</h3>
                <p className="text-sm text-gray-600">1080x1080px</p>
                <Badge variant="secondary" className="text-xs">
                  Instagram • Facebook
                </Badge>
              </div>
              <Button onClick={() => generatePromoImage("square")} disabled={isGenerating} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Baixar PNG
              </Button>
            </div>

            {/* Stories */}
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="w-full h-32 bg-gradient-to-b from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <div className="text-white font-bold text-2xl">9:16</div>
              </div>
              <div>
                <h3 className="font-semibold">Stories</h3>
                <p className="text-sm text-gray-600">1080x1920px</p>
                <Badge variant="secondary" className="text-xs">
                  Instagram • WhatsApp
                </Badge>
              </div>
              <Button onClick={() => generatePromoImage("story")} disabled={isGenerating} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Baixar PNG
              </Button>
            </div>

            {/* Banner */}
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="w-full h-32 bg-gradient-to-r from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <div className="text-white font-bold text-2xl">16:9</div>
              </div>
              <div>
                <h3 className="font-semibold">Banner</h3>
                <p className="text-sm text-gray-600">1200x630px</p>
                <Badge variant="secondary" className="text-xs">
                  Sites • Blogs
                </Badge>
              </div>
              <Button onClick={() => generatePromoImage("banner")} disabled={isGenerating} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Baixar PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arquivo de Texto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Informações da Loja</span>
          </CardTitle>
          <CardDescription>Arquivo de texto com todas as informações para compartilhamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Arquivo de Informações</h3>
              <p className="text-sm text-gray-600">Contém link da loja, produtos, preços e instruções</p>
              <Badge variant="outline" className="text-xs mt-1">
                TXT • Para WhatsApp
              </Badge>
            </div>
            <Button onClick={generateTextFile}>
              <Download className="h-4 w-4 mr-1" />
              Baixar TXT
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instruções de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Como Usar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-600">📱 Para Redes Sociais:</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• Use o formato quadrado para posts no Instagram e Facebook</li>
                <li>• Use o formato Stories para Instagram Stories e Status do WhatsApp</li>
                <li>• Adicione texto personalizado nas legendas</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-600">🌐 Para Sites e Blogs:</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• Use o formato banner para headers de sites</li>
                <li>• Inclua o link da loja em botões próximos à imagem</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-600">💬 Para WhatsApp:</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• Use o arquivo TXT para copiar e colar informações</li>
                <li>• Envie as imagens junto com o link da loja</li>
                <li>• Compartilhe nos grupos e contatos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {isGenerating && (
        <div className="text-center text-gray-600">
          <p>Gerando imagem... Por favor, aguarde.</p>
        </div>
      )}
    </div>
  )
}
