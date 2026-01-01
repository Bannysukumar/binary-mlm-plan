import { doc, setDoc, updateDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "./firebase"
import type { User, BinaryPosition } from "@/shared/types"

export const binaryTreeService = {
  // Create initial binary position for new user
  async createBinaryPosition(companyId: string, userId: string, placementSide?: "left" | "right") {
    try {
      const docRef = doc(db, "companies", companyId, "users", userId, "binaryTree", "position")

      const position: BinaryPosition = {
        userId,
        left: undefined,
        right: undefined,
        leftVolume: 0,
        rightVolume: 0,
      }

      await setDoc(docRef, position)
      return position
    } catch (error) {
      console.error("[v0] Error creating binary position:", error)
      throw error
    }
  },

  // Get binary position for a user
  async getBinaryPosition(companyId: string, userId: string): Promise<BinaryPosition | null> {
    try {
      const docRef = doc(db, "companies", companyId, "users", userId, "binaryTree", "position")
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return docSnap.data() as BinaryPosition
    } catch (error) {
      console.error("[v0] Error getting binary position:", error)
      throw error
    }
  },

  // Place a user in binary tree (left or right)
  async placeUser(companyId: string, newUserId: string, parentId: string, side: "left" | "right"): Promise<void> {
    try {
      const parentRef = doc(db, "companies", companyId, "users", parentId, "binaryTree", "position")
      const parentSnap = await getDoc(parentRef)

      if (!parentSnap.exists()) {
        throw new Error("Parent position not found")
      }

      // Check if position is available
      const parentData = parentSnap.data() as BinaryPosition
      const positionField = side === "left" ? "left" : "right"

      if (parentData[positionField]) {
        throw new Error(`Position ${side} is already occupied`)
      }

      // Update parent position
      await updateDoc(parentRef, {
        [positionField]: newUserId,
        [`${side}Volume`]: parentData[`${side}Volume`] || 0,
      })

      // Create position for new user
      await this.createBinaryPosition(companyId, newUserId, side)
    } catch (error) {
      console.error("[v0] Error placing user in binary tree:", error)
      throw error
    }
  },

  // Get direct downline (immediate children)
  async getDirectDownline(companyId: string, userId: string): Promise<BinaryPosition | null> {
    try {
      return await this.getBinaryPosition(companyId, userId)
    } catch (error) {
      console.error("[v0] Error getting direct downline:", error)
      throw error
    }
  },

  // Get entire downline tree
  async getDownlineTree(
    companyId: string,
    userId: string,
    depth = 0,
    maxDepth = 10,
  ): Promise<{ user: User; children: any[] }[]> {
    try {
      if (depth > maxDepth) return []

      const q = query(collection(db, "companies", companyId, "users"), where("sponsorId", "==", userId))
      const snapshot = await getDocs(q)

      const downline = []

      for (const docSnap of snapshot.docs) {
        const user = docSnap.data() as User
        const children = await this.getDownlineTree(companyId, user.id, depth + 1, maxDepth)

        downline.push({
          user,
          children,
        })
      }

      return downline
    } catch (error) {
      console.error("[v0] Error getting downline tree:", error)
      throw error
    }
  },

  // Calculate team volume (sum of all downline volumes)
  async calculateTeamVolume(companyId: string, userId: string): Promise<number> {
    try {
      const position = await this.getBinaryPosition(companyId, userId)
      if (!position) return 0

      let volume = position.leftVolume + position.rightVolume

      // Recursively add children volumes
      if (position.left) {
        volume += await this.calculateTeamVolume(companyId, position.left)
      }
      if (position.right) {
        volume += await this.calculateTeamVolume(companyId, position.right)
      }

      return volume
    } catch (error) {
      console.error("[v0] Error calculating team volume:", error)
      throw error
    }
  },

  // Get team count
  async getTeamCount(companyId: string, userId: string): Promise<{ total: number; left: number; right: number }> {
    try {
      const q = query(collection(db, "companies", companyId, "users"), where("sponsorId", "==", userId))
      const snapshot = await getDocs(q)

      let leftCount = 0
      let rightCount = 0

      for (const docSnap of snapshot.docs) {
        const user = docSnap.data() as User
        if (user.placementSide === "left") leftCount++
        else if (user.placementSide === "right") rightCount++
      }

      return {
        total: snapshot.size,
        left: leftCount,
        right: rightCount,
      }
    } catch (error) {
      console.error("[v0] Error getting team count:", error)
      throw error
    }
  },

  // Update binary volume
  async updateBinaryVolume(companyId: string, userId: string, side: "left" | "right", amount: number): Promise<void> {
    try {
      const docRef = doc(db, "companies", companyId, "users", userId, "binaryTree", "position")
      const field = `${side}Volume`

      await updateDoc(docRef, {
        [field]: (await getDoc(docRef)).data()?.[field] || 0 + amount,
      })
    } catch (error) {
      console.error("[v0] Error updating binary volume:", error)
      throw error
    }
  },
}
