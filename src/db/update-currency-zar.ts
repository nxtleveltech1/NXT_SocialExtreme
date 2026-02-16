import { db } from "./db"
import { salesProducts, orders } from "./schema"
import { eq } from "drizzle-orm"

export async function updateCurrencyToZAR() {
  try {
    console.log("Updating currency to ZAR...")

    // Update all products
    const products = await db.select().from(salesProducts)
    for (const product of products) {
      await db
        .update(salesProducts)
        .set({ currency: "ZAR" })
        .where(eq(salesProducts.id, product.id))
    }
    console.log(`Updated ${products.length} products to ZAR`)

    // Update all orders
    const ordersList = await db.select().from(orders)
    for (const order of ordersList) {
      await db
        .update(orders)
        .set({ currency: "ZAR" })
        .where(eq(orders.id, order.id))
    }
    console.log(`Updated ${ordersList.length} orders to ZAR`)

    console.log("Currency update completed successfully")
  } catch (error) {
    console.error("Error updating currency:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  updateCurrencyToZAR()
    .then(() => {
      console.log("Update completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Update failed:", error)
      process.exit(1)
    })
}



