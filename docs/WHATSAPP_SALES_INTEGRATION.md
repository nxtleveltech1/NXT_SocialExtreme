# WhatsApp Sales App Integration

This document describes the WhatsApp sales functionality that has been integrated into the primary MobileMate application.

## Overview

The WhatsApp sales app has been fully migrated and integrated into the primary application. Customers can now browse products, add items to a cart, and send orders directly via WhatsApp messages.

## Database Schema

### New Tables

1. **sales_products** - Product catalog for WhatsApp sales
   - Stores product information (name, price, description, images, features, specifications)
   - Linked to channels (optional)
   - Supports categories and availability status

2. **shopping_carts** - Shopping carts per conversation/user
   - Linked to WhatsApp conversations
   - Tracks cart status (active, abandoned, converted)

3. **cart_items** - Items in shopping carts
   - Links products to carts
   - Stores quantity and price snapshot

4. **orders** - Completed orders
   - Created from carts
   - Links to WhatsApp conversations and messages
   - Tracks order status and total amount

5. **order_items** - Items in orders
   - Snapshot of ordered products
   - Stores quantity and price at time of order

## API Endpoints

### Products
- `GET /api/sales/products` - List all active products
- `POST /api/sales/products` - Create a new product

### Shopping Cart
- `GET /api/sales/cart?conversationId=X` - Get cart for a conversation
- `POST /api/sales/cart` - Add item to cart
- `PATCH /api/sales/cart` - Update item quantity
- `DELETE /api/sales/cart` - Remove item from cart

### Orders
- `POST /api/sales/orders` - Create order from cart and send via WhatsApp
- `GET /api/sales/orders` - List orders (filtered by conversationId or phoneNumber)

## Components

### ProductCard
Displays a single product with:
- Product image
- Name, description, and price
- Features and specifications
- Add to cart button
- View details modal

### ShoppingCart
Shopping cart sidebar component with:
- List of cart items
- Quantity controls
- Total price calculation
- Send order via WhatsApp button

### ProductCatalog
Main catalog component that:
- Fetches and displays products
- Manages cart state
- Handles add/update/remove cart operations
- Sends orders via WhatsApp

## Integration Points

### WhatsApp Inbox Integration
- Sales catalog accessible at `/inbox/whatsapp-sales?conversationId=X`
- Automatically links to WhatsApp conversations
- Uses conversation phone number and channel ID for order sending

### Order Message Format
When an order is sent via WhatsApp, it generates a formatted message:
```
🛒 *Olá! Gostaria de fazer um pedido:*

1. *Product Name*
   Quantidade: 2
   Preço unitário: R$ 299,99
   Subtotal: R$ 599,98

💰 *Total: R$ 599,98*

Aguardo confirmação e informações sobre entrega! 😊
```

## Setup Instructions

### 1. Database Migration
Run the database migration to create the new tables:
```bash
bun run db:push
```

### 2. Seed Initial Products
Seed the database with initial products:
```bash
bun run src/db/seed-sales.ts
```

### 3. Product Images
Product images should be placed in `/public/images/`:
- `fone-bluetooth-premium.jpg`
- `carregador-usb-c.jpg`
- `cabo-usb-c.jpg`
- `carregador-wireless.jpg`
- `fone-gaming.jpg`
- `power-bank.jpg`

### 4. Access Sales Catalog
Navigate to `/inbox/whatsapp-sales` or `/inbox/whatsapp-sales?conversationId=X` to view the product catalog.

## Usage Flow

1. **Customer browses products** - Views product catalog
2. **Adds items to cart** - Clicks "Adicionar" on products
3. **Manages cart** - Updates quantities or removes items
4. **Sends order** - Clicks "Enviar Pedido via WhatsApp"
5. **Order created** - Order is saved to database
6. **WhatsApp message sent** - Formatted order message sent via WhatsApp API
7. **Cart converted** - Cart status changed to "converted"

## Features

- ✅ Product catalog with images, descriptions, and specifications
- ✅ Shopping cart management
- ✅ Order creation and tracking
- ✅ WhatsApp message integration
- ✅ Price formatting (BRL currency)
- ✅ Responsive design
- ✅ Product categories and filtering
- ✅ Cart persistence per conversation

## Future Enhancements

- Product management UI (admin panel)
- Order status tracking and updates
- Payment integration
- Shipping address collection
- Order history for customers
- Product search and filtering
- Product variants (sizes, colors, etc.)
- Inventory management
- Discount codes and promotions



