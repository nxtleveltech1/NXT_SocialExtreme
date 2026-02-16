import { db } from "./db"
import { salesProducts } from "./schema"

const initialProducts = [
  {
    name: "Premium Bluetooth Headphones",
    price: 29999, // $299.99 in cents
    image: "/images/fone-bluetooth-premium.jpg",
    description:
      "Wireless headphones with active noise cancellation and long-lasting battery. Perfect for music, calls, and work.",
    category: "Audio",
    features: ["Bluetooth 5.0", "Active noise cancellation", "30h battery life", "IPX4 water resistant"],
    specifications: {
      Connectivity: "Bluetooth 5.0",
      Battery: "30 hours",
      Resistance: "IPX4",
      Weight: "250g",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    name: "Fast USB-C Charger 65W",
    price: 8999, // $89.99 in cents
    image: "/images/carregador-usb-c.jpg",
    description:
      "Universal fast charger compatible with smartphones, tablets, and laptops. Smart charging technology.",
    category: "Chargers",
    features: ["Fast charging 65W", "USB-C PD", "Overload protection", "Compact and portable"],
    specifications: {
      Power: "65W",
      Input: "100-240V",
      Output: "USB-C PD",
      Dimensions: "6x6x3cm",
      Warranty: "2 years",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    name: "Original USB-C Cable 2m",
    price: 4999, // $49.99 in cents
    image: "/images/cabo-usb-c.jpg",
    description:
      "High-quality original USB-C cable for charging and data transfer. Premium and durable material.",
    category: "Cables",
    features: ["2 meters length", "USB-C to USB-C", "Fast transfer", "Durable material"],
    specifications: {
      Length: "2 meters",
      Type: "USB-C to USB-C",
      Speed: "480 Mbps",
      Material: "Braided nylon",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    name: "Wireless Inductive Charger 15W",
    price: 12999, // $129.99 in cents
    image: "/images/carregador-wireless.jpg",
    description:
      "Wireless charging pad compatible with all Qi devices. Elegant design and efficient charging.",
    category: "Chargers",
    features: ["15W charging", "Qi compatible", "LED indicator", "Elegant design"],
    specifications: {
      Power: "15W maximum",
      Compatibility: "Universal Qi",
      Dimensions: "10x10x1cm",
      Material: "Premium aluminum",
      Warranty: "2 years",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    name: "Gaming RGB Headset",
    price: 19999, // $199.99 in cents
    image: "/images/fone-gaming.jpg",
    description:
      "Gaming headset with RGB lighting and detachable microphone. Surround sound for the best gaming experience.",
    category: "Audio",
    features: ["7.1 surround sound", "Detachable microphone", "RGB lighting", "Comfortable ear pads"],
    specifications: {
      Connectivity: "USB + P2",
      Drivers: "50mm",
      Frequency: "20Hz-20kHz",
      Weight: "320g",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    name: "Portable Power Bank 20000mAh",
    price: 15999, // $159.99 in cents
    image: "/images/power-bank.jpg",
    description:
      "High-capacity power bank with fast charging and multiple ports. Perfect for travel and daily use.",
    category: "Chargers",
    features: ["20000mAh", "Fast charging", "3 USB ports", "Digital display"],
    specifications: {
      Capacity: "20000mAh",
      Ports: "2x USB-A + 1x USB-C",
      Input: "USB-C 18W",
      Output: "22.5W maximum",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
]

export async function seedSalesProducts() {
  try {
    console.log("Seeding sales products...")

    // Check if products already exist
    const existingProducts = await db.select().from(salesProducts).limit(1)

    if (existingProducts.length > 0) {
      console.log("Products already exist. Skipping seed.")
      return
    }

    // Insert products
    for (const product of initialProducts) {
      await db.insert(salesProducts).values({
        ...product,
        currency: "ZAR",
      })
    }

    console.log(`Successfully seeded ${initialProducts.length} products`)
  } catch (error) {
    console.error("Error seeding sales products:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedSalesProducts()
    .then(() => {
      console.log("Seed completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seed failed:", error)
      process.exit(1)
    })
}

