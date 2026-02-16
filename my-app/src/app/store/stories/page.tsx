"use client"

import { useState } from "react"
import StoryPromo from "@/components/store/StoryPromo"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"

export default function StoriesPage() {
  const [showInstructions, setShowInstructions] = useState(true)

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {showInstructions && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-md">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Stories for Instagram/WhatsApp</h1>
            <p className="text-gray-600 mb-4">
              Optimized version for sharing on Stories. Preview the content and use the buttons below to share.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowInstructions(false)}>
                Hide instructions
              </Button>
              <Button size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div className="bg-gray-800 p-2 rounded-3xl shadow-xl">
            <StoryPromo />
          </div>
        </div>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>Optimized format for Stories (9:16)</p>
          <p>Swipe or click indicators to see all slides</p>
        </div>
      </div>
    </div>
  )
}
