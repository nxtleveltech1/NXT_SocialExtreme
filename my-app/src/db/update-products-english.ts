import { db } from "./db"
import { salesProducts } from "./schema"
import { eq } from "drizzle-orm"

const productUpdates = [
  {
    name: "Premium Bluetooth Headphones",
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
  },
  {
    name: "Fast USB-C Charger 65W",
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
  },
  {
    name: "Original USB-C Cable 2m",
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
  },
  {
    name: "Wireless Inductive Charger 15W",
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
  },
  {
    name: "Gaming RGB Headset",
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
  },
  {
    name: "Portable Power Bank 20000mAh",
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
  },
]

export async function updateProductsToEnglish() {
  try {
    console.log("Updating products to English...")

    // Get all existing products
    const existingProducts = await db.select().from(salesProducts)

    if (existingProducts.length === 0) {
      console.log("No products found. Run seed script first.")
      return
    }

    // Update each product
    for (let i = 0; i < Math.min(existingProducts.length, productUpdates.length); i++) {
      const product = existingProducts[i]
      const update = productUpdates[i]

      await db
        .update(salesProducts)
        .set({
          name: update.name,
          description: update.description,
          category: update.category,
          features: update.features,
          specifications: update.specifications,
        })
        .where(eq(salesProducts.id, product.id))

      console.log(`Updated product ${i + 1}: ${update.name}`)
    }

    console.log(`Successfully updated ${Math.min(existingProducts.length, productUpdates.length)} products`)
  } catch (error) {
    console.error("Error updating products:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  updateProductsToEnglish()
    .then(() => {
      console.log("Update completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Update failed:", error)
      process.exit(1)
    })
}



