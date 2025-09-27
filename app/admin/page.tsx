"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import {
  Star,
  Bell,
  Megaphone,
  Award,
  Plus,
  Trash2,
  Search,
  Edit,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Clock,
  QrCode,
  Download,
  Printer,
} from "lucide-react"
import type { Order, Table as RestaurantTable, MenuItem } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"

export const dynamic = "force-dynamic"

// Helper function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

const getSpanishContent = (jsonContent: string, fallback = "") => {
  try {
    const parsed = JSON.parse(jsonContent)
    return parsed.es?.title || parsed.es?.content || fallback
  } catch {
    return jsonContent || fallback
  }
}

interface Announcement {
  id: number
  title: string
  content: string
  type: string
  priority: number
  is_active: boolean
  end_date?: string
  created_at: string
  title_translations?: string // Added for translations
  content_translations?: string // Added for translations
  // New fields for alert scheduling
  schedule_days?: string[] | null
  start_time?: string | null
  end_time?: string | null
  is_scheduled?: boolean
}

interface WaiterCall {
  id: string
  table_id: number
  tipo: string
  status: string
  created_at: string
  updated_at: string
  table?: {
    table_number: number
  }
}

interface BillRequest {
  id: number
  table_id: number
  order_id: number
  status: string
  payment_method?: string
  notes?: string
  created_at: string
  processed_at?: string
  delivered_at?: string
  table?: RestaurantTable
  order?: Order
}

interface Review {
  id: number
  order_id: number
  table_id: number
  customer_name: string
  rating: number
  food_rating: number
  service_rating: number
  ambiance_rating: number
  comment?: string
  is_public: boolean
  created_at: string
  table?: RestaurantTable
  order?: Order
}

interface SimpleRating {
  id: number
  table_id: number
  order_id?: number
  user_number: number
  rating: number
  created_at: string
  table?: RestaurantTable
}

interface SimpleRatingStats {
  total_ratings: number
  average_rating: number
  rating_distribution: { [key: number]: number }
}

interface ReviewStats {
  total_reviews: number
  average_rating: number
  average_food_rating: number
  average_service_rating: number
  average_ambiance_rating: number
  rating_distribution: { [key: number]: number }
}

const getDisabledAllergens = (item: any) => {
  const disabledAllergens = new Set<string>()

  // If gluten-free is checked, disable Gluten
  if (item.is_gluten_free) {
    disabledAllergens.add("Gluten")
  }

  // If vegan is checked, disable animal products
  if (item.is_vegan) {
    disabledAllergens.add("Leche/Lactosa")
    disabledAllergens.add("Huevo")
    disabledAllergens.add("Pescado")
    disabledAllergens.add("Crustáceos")
    disabledAllergens.add("Moluscos")
  }

  // If vegetarian is checked, disable seafood
  if (item.is_vegetarian) {
    disabledAllergens.add("Pescado")
    disabledAllergens.add("Crustáceos")
    disabledAllergens.add("Moluscos")
  }

  return disabledAllergens
}

const removeDisabledAllergens = (allergens: string[], disabledAllergens: Set<string>) => {
  return allergens.filter((allergen) => !disabledAllergens.has(allergen))
}

// Define Category and Allergen interfaces if they are used elsewhere and not defined
interface Category {
  id: number
  name: string
}

interface Allergen {
  id: number
  name: string
}

interface User {
  id: string
  email: string
  // Add other user properties as needed
}

const AdminPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([]) // Added state for categories
  const [allergens, setAllergens] = useState<Allergen[]>([]) // Added state for allergens
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [users, setUsers] = useState<User[]>([]) // Added state for users
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("orders") // Changed default tab to 'orders'

  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const [showCreateTableForm, setShowCreateTableForm] = useState(false)
  const [newTable, setNewTable] = useState({
    identifier: "",
    location: "Salon principal",
    customLocation: "",
    capacity: 4,
  })

  const [showNutritionalInfo, setShowNutritionalInfo] = useState(false)
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([])
  const [billRequests, setBillRequests] = useState<BillRequest[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]) // Added state for featured items
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [simpleRatings, setSimpleRatings] = useState<SimpleRating[]>([])
  const [simpleRatingStats, setSimpleRatingStats] = useState<SimpleRatingStats | null>(null)

  // Initialize editingItem with proper default values to prevent undefined
  const [editingItem, setEditingItem] = useState<any>({
    name: "",
    description: "",
    price: "",
    category: "Entrante",
    category_custom: "",
    is_available: true,
    is_featured: false, // Added is_featured field
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    allergens: [],
    variants: [],
    customizations: [],
    images: [],
    additional_allergens: "", // Changed from other_allergen to additional_allergens
    nutritional_info: {
      energy_kj_100: 0,
      energy_kcal_100: 0,
      fat_g_100: 0,
      saturates_g_100: 0,
      carbs_g_100: 0,
      sugars_g_100: 0,
      protein_g_100: 0,
      salt_g_100: 0,
      basis: "per_100g",
      enabled: false,
    },
    preparation_time: "15", // Added preparation_time
    is_scheduled: false,
    schedule_days: [],
    start_time: "",
    end_time: "",
  })
  const [editingId, setEditingId] = useState<number | null>(null) // Added for editing ID
  const [isEditing, setIsEditing] = useState(false) // Added state to track if in editing mode

  const predefinedAllergens = [
    "Gluten",
    "Cacahuete",
    "Apio",
    "Altramuces",
    "Crustáceos",
    "Huevo",
    "Soja",
    "Mostaza",
    "Moluscos",
    "Sulfitos",
    "Leche/Lactosa",
    "Sésamo",
    "Pescado",
    "Frutos de cáscara",
  ]

  const [imageFiles, setImageFiles] = useState<Array<{ file: File | null; preview: string; is_primary: boolean }>>([])
  const [editImageFiles, setEditImageFiles] = useState<
    Array<{ file: File | null; preview: string; is_primary: boolean }>
  >([]) // State for editing images

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "Entrante", // Categoría predefinida
    category_custom: "", // Para "Otras"
    is_available: true,
    is_featured: false, // Added is_featured field
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    allergens: [] as string[], // Cambiar a array de strings
    variants: [] as Array<{ name: string; price: string }>,
    customizations: [] as Array<{ name: string; type: "free" | "paid"; price: string }>,
    images: [] as Array<{ url: string; is_primary: boolean }>,
    additional_allergens: "", // Changed from other_allergen to additional_allergens
    nutritional_info: {
      energy_kj_100: 0,
      energy_kcal_100: 0,
      fat_g_100: 0,
      saturates_g_100: 0,
      carbs_g_100: 0,
      sugars_g_100: 0,
      protein_g_100: 0,
      salt_g_100: 0,
      basis: "per_100g" as const,
      enabled: false,
    },
    preparation_time: "15", // Added preparation_time
    is_scheduled: false,
    schedule_days: [] as string[],
    start_time: "",
    end_time: "",
  })

  // Estados para formularios
  const [showCreateModal, setShowCreateModal] = useState(false) // Eliminated newCategory state
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "general",
    priority: "1",
    end_date: "",
    is_active: true,
    // New fields for alert scheduling
    schedule_days: [] as string[],
    start_time: "",
    end_time: "",
    is_scheduled: false,
  })

  const [showTranslationPreview, setShowTranslationPreview] = useState(false)
  const [translations, setTranslations] = useState({
    en: { title: "", content: "" },
    de: { title: "", content: "" },
    fr: { title: "", content: "" },
    zh: { title: "", content: "" },
  })
  const [isTranslating, setIsTranslating] = useState(false)

  const [isPublishing, setIsPublishing] = useState(false)

  const [originalAnnouncement, setOriginalAnnouncement] = useState({ title: "", content: "" })

  // State for showing/hiding the "Other Allergens" input
  const [showOtherAllergens, setShowOtherAllergens] = useState(false)

  // Removed activeTab state as it's now managed by the Tabs component

  useEffect(() => {
    fetchData()
  }, []) // Fetch data on component mount

  const fetchData = async () => {
    try {
      console.log("[v0] Starting fetchData")
      setIsLoading(true)

      const endpoints = [
        { name: "tables", url: "/api/tables" },
        { name: "menuItems", url: "/api/menu/items" },
        { name: "orders", url: "/api/orders" },
        { name: "announcements", url: "/api/announcements" },
        { name: "waiterCalls", url: "/api/waiter-calls" },
        { name: "billRequests", url: "/api/bill-requests" },
        { name: "simpleRatings", url: "/api/simple-ratings" },
        { name: "simpleRatingStats", url: "/api/simple-ratings/stats" },
        { name: "featured", url: "/api/menu/featured" },
        { name: "categories", url: "/api/categories" },
        { name: "allergens", url: "/api/allergens" },
        { name: "users", url: "/api/users" },
      ]

      const responses = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            console.log(`[v0] Fetching ${endpoint.name} from ${endpoint.url}`)
            const response = await fetch(endpoint.url)

            if (!response.ok) {
              const errorText = await response.text()
              console.error(`[v0] ${endpoint.name} API failed:`, response.status, errorText)
              throw new Error(`${endpoint.name} API failed: ${response.status} - ${errorText.substring(0, 100)}`)
            }

            const data = await response.json()
            console.log(`[v0] Successfully fetched ${endpoint.name}:`, Object.keys(data))
            return { name: endpoint.name, data, success: true }
          } catch (error) {
            console.error(`[v0] Error fetching ${endpoint.name}:`, error)
            return { name: endpoint.name, error: error.message, success: false }
          }
        }),
      )

      // Check for any failed requests
      const failedRequests = responses.filter((r) => !r.success)
      if (failedRequests.length > 0) {
        console.error("[v0] Some API calls failed:", failedRequests)
        throw new Error(`Failed to fetch: ${failedRequests.map((r) => r.name).join(", ")}`)
      }

      // Extract data from successful responses
      const dataMap = responses.reduce(
        (acc, response) => {
          if (response.success) {
            acc[response.name] = response.data
          }
          return acc
        },
        {} as Record<string, any>,
      )

      console.log("[v0] Data loaded successfully")

      try {
        console.log("[v0] Setting state data...")
        setTables(dataMap.tables?.tables || [])
        setMenuItems(dataMap.menuItems?.items || [])
        setOrders(dataMap.orders?.orders || [])
        setAnnouncements(dataMap.announcements?.announcements || [])
        setWaiterCalls(dataMap.waiterCalls?.calls || [])
        setBillRequests(dataMap.billRequests?.requests || [])
        setSimpleRatings(dataMap.simpleRatings?.ratings || [])
        setSimpleRatingStats(dataMap.simpleRatingStats?.stats || null)
        setFeaturedItems(dataMap.featured?.items || [])
        setCategories(dataMap.categories?.categories || [])
        setAllergens(dataMap.allergens?.allergens || [])
        setUsers(dataMap.users?.users || [])
        console.log("[v0] State data set successfully")
      } catch (stateError) {
        console.error("[v0] Error setting state:", stateError)
        throw stateError
      }

      console.log("[v0] About to set loading to false")
    } catch (error) {
      console.error("[v0] Error in fetchData:", error)
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      })
    } finally {
      console.log("[v0] In finally block, setting loading to false")
      setIsLoading(false)
      console.log("[v0] Loading state set to false")
    }
  }

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Estado del pedido actualizado",
        })
        fetchData()
      } else {
        throw new Error("Error updating order")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el pedido",
        variant: "destructive",
      })
    }
  }

  const updateTableStatus = async (tableId: number, status: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }), // Corrected JSON.JSON to JSON.stringify
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Estado de la mesa actualizado",
        })
        fetchData()
      } else {
        throw new Error("Error updating table")
      }
    } catch (error) {
      console.error("Error updating table:", error)
      toast({
        title: "Error",
        description: "Error al actualizar la mesa",
        variant: "destructive",
      })
    }
  }

  const searchMenuItems = async () => {
    try {
      const response = await fetch(`/api/menu/items?search=${encodeURIComponent(searchTerm)}`)
      if (response.ok) {
        const data = await response.json()
        setMenuItems(data.items || [])
      }
    } catch (error) {
      console.error("Error searching menu items:", error)
    }
  }

  const loadItemForEdit = (item: any) => {
    console.log("[v0] Loading item for edit:", item) // Added debug log to see item structure

    // Check if the category exists in the predefined categories list
    const isCustomCategory = !categories.some((cat) => cat.name === item.category)

    setEditingId(item.id)
    setEditingItem({
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      price: item.price?.toString() || "",
      category: isCustomCategory ? "Otras" : item.category || "Entrante", // Set to "Otras" if custom
      category_custom: isCustomCategory ? item.category : "", // Set custom value if it's a custom category
      is_available: item.is_available !== false,
      is_featured: item.is_featured || false,
      is_vegetarian: item.is_vegetarian || false,
      is_vegan: item.is_vegan || false,
      is_gluten_free: item.is_gluten_free || false,
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      variants: Array.isArray(item.variants) ? item.variants : [],
      customizations: Array.isArray(item.customizations) ? item.customizations : [],
      images: Array.isArray(item.images)
        ? item.images
        : item.image_url
          ? [{ url: item.image_url, is_primary: true }]
          : [],
      additional_allergens: "", // Changed from other_allergen to additional_allergens
      nutritional_info: item.nutritional_info || {
        energy_kj_100: 0,
        energy_kcal_100: 0,
        fat_g_100: 0,
        saturates_g_100: 0,
        carbs_g_100: 0,
        sugars_g_100: 0,
        protein_g_100: 0,
        salt_g_100: 0,
        basis: "per_100g",
        enabled: false,
      },
      preparation_time: item.preparation_time?.toString() || "15", // Load preparation_time
      is_scheduled: item.is_scheduled || false,
      schedule_days: Array.isArray(item.schedule_days) ? item.schedule_days : [],
      start_time: item.start_time || "",
      end_time: item.end_time || "",
    })
    setIsEditing(true) // Set editing flag

    // Initialize imageFiles state based on existing images
    const existingImages = Array.isArray(item.images)
      ? item.images
      : item.image_url
        ? [{ url: item.image_url, is_primary: true }]
        : []
    const initialImageFiles = existingImages.map((img: any) => ({
      file: null,
      preview: img.url,
      is_primary: img.is_primary,
    }))
    setEditImageFiles(initialImageFiles) // Use editImageFiles for editing

    // Set showNutritionalInfo based on loaded data
    setShowNutritionalInfo(!!item.nutritional_info?.enabled)

    // Set showOtherAllergens based on existing other_allergen data
    setShowOtherAllergens(!!item.additional_allergens) // Check for additional_allergens
  }

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)

    console.log("[v0] Sending upload request for file:", file.name)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    console.log("[v0] Upload response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Upload API error response:", errorText)

      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`Upload failed: ${errorData.error || errorData.details || "Unknown error"}`)
      } catch {
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`)
      }
    }

    const data = await response.json()
    console.log("[v0] Upload successful, received URL:", data.url)
    return data.url
  }

  const updateMenuItem = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    console.log("[v0] Starting menu item update process")
    console.log("[v0] editingId:", editingId)
    console.log("[v0] editingItem:", editingItem)

    if (!editingId || !editingItem) {
      setIsSubmitting(false)
      return
    }

    try {
      // Process allergens
      const additionalAllergens = editingItem.additional_allergens
        ? editingItem.additional_allergens
            .split(",")
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
        : []

      const allAllergens = [...(editingItem.allergens || []), ...additionalAllergens]

      const processedImages = []
      for (let i = 0; i < editImageFiles.length; i++) {
        const img = editingItem.images[i]
        const fileData = editImageFiles[i]

        if (fileData?.file) {
          // New file to upload
          try {
            console.log("[v0] Uploading new file:", fileData.file.name)
            const uploadedUrl = await uploadImageToSupabase(fileData.file)
            processedImages.push({
              url: uploadedUrl,
              is_primary: fileData.is_primary || img?.is_primary || false,
            })
          } catch (uploadError) {
            console.error("[v0] Error uploading image:", uploadError)
            toast({
              title: "Error",
              description: "Error al subir imagen. Intenta de nuevo.",
              variant: "destructive",
            })
            return
          }
        } else if (img?.url && !img.url.startsWith("blob:")) {
          // Existing image URL (not a blob)
          console.log("[v0] Keeping existing image:", img.url)
          processedImages.push({
            url: img.url,
            is_primary: img.is_primary,
          })
        }
        // Skip blob URLs as they are temporary browser references
      }

      const nutritionalInfo = editingItem.nutritional_info
        ? editingItem.nutritional_info
        : {
            energy_kj_100: 0,
            energy_kcal_100: 0,
            fat_g_100: 0,
            saturates_g_100: 0,
            carbs_g_100: 0,
            sugars_g_100: 0,
            protein_g_100: 0,
            salt_g_100: 0,
            basis: "per_100g",
            enabled: false,
          }

      const finalCategory = editingItem.category === "Otras" ? editingItem.category_custom : editingItem.category

      const updateData = {
        id: editingId,
        name: editingItem.name,
        description: editingItem.description,
        price: Number.parseFloat(editingItem.price.toString()),
        category: finalCategory, // Use finalCategory instead of editingItem.category
        is_available: editingItem.is_available,
        is_featured: editingItem.is_featured, // Include is_featured in updateData
        is_vegetarian: editingItem.is_vegetarian ? true : false,
        is_vegan: editingItem.is_vegan ? true : false,
        is_gluten_free: editingItem.is_gluten_free ? true : false,
        allergens: allAllergens,
        variants: editingItem.variants || [],
        customizations: editingItem.customizations || [],
        images: processedImages,
        nutritional_info: nutritionalInfo,
        preparation_time: Number.parseInt(editingItem.preparation_time || "15"), // Include preparation_time
        // Add scheduling data to update
        is_scheduled:
          editingItem.is_scheduled &&
          editingItem.schedule_days?.length > 0 &&
          editingItem.start_time &&
          editingItem.end_time,
        schedule_days: editingItem.is_scheduled ? editingItem.schedule_days : null,
        start_time: editingItem.is_scheduled ? editingItem.start_time : null,
        end_time: editingItem.is_scheduled ? editingItem.end_time : null,
      }

      console.log("[v0] Updating menu item with full data:", updateData)

      const response = await fetch("/api/menu/items", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Menu item updated successfully:", result)

        toast({
          title: "Éxito",
          description: "Plato actualizado correctamente",
        })

        setEditingId(null)
        setEditingItem(null)
        setIsEditing(false) // Reset editing flag
        setEditImageFiles([])
        await fetchData() // Renamed from fetchAdminData to fetchData for consistency
      } else {
        let errorMessage = "Error updating menu item"
        let responseText = ""

        try {
          responseText = await response.text()
          console.log("[v0] Error response text:", responseText)

          if (responseText.trim().startsWith("{")) {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.error || errorMessage
          } else {
            errorMessage = responseText || `Error ${response.status}: ${response.statusText}`
          }
        } catch (parseError) {
          console.error("[v0] Error parsing response:", parseError)
          errorMessage = responseText || `Error ${response.status}: ${response.statusText}`
        }

        console.error("[v0] Error updating menu item:", {
          status: response.status,
          statusText: response.statusText,
          responseText,
          errorMessage,
        })

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error in updateMenuItem:", error)
      toast({
        title: "Error",
        description: "Error inesperado al actualizar el plato",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    // Limpiar URLs de preview
    imageFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    editImageFiles.forEach((file) => {
      // Also clear editImageFiles previews
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })

    setNewItem({
      name: "",
      description: "",
      price: "",
      category: "Entrante", // Reset to default
      category_custom: "",
      preparation_time: "15",
      is_available: true,
      is_featured: false, // Reset is_featured
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      allergens: [],
      variants: [],
      customizations: [],
      images: [],
      additional_allergens: "", // Changed from other_allergen to additional_allergens
      nutritional_info: null, // Reset to null
      is_scheduled: false,
      schedule_days: [],
      start_time: "",
      end_time: "",
    })
    setImageFiles([])
    setEditImageFiles([]) // Reset editImageFiles
    setEditingId(null) // Clear editing ID
    setEditingItem(null) // Clear editing item
    setIsEditing(false) // Reset editing flag
    setShowNutritionalInfo(false) // Reset nutritional info visibility
    setShowOtherAllergens(false) // Reset other allergens visibility
  }

  const cancelEdit = () => {
    resetForm()
  }

  const handleImageFileChange = (index: number, file: File | null) => {
    const updatedFiles = [...imageFiles]
    let previewUrl = ""

    if (file) {
      previewUrl = URL.createObjectURL(file)
      updatedFiles[index] = { ...updatedFiles[index], file, preview: previewUrl }
    } else {
      if (updatedFiles[index]?.preview) {
        URL.revokeObjectURL(updatedFiles[index].preview)
      }
      updatedFiles[index] = { ...updatedFiles[index], file: null, preview: "" }
    }

    setImageFiles(updatedFiles)

    // Actualizar también el estado del item con la URL de preview o URL original si no hay archivo
    const updatedImages = [...newItem.images]
    if (file) {
      updatedImages[index] = { ...updatedImages[index], url: previewUrl }
    } else {
      // If file is cleared, revert to the original URL if it exists
      updatedImages[index] = { ...updatedImages[index], url: updatedImages[index]?.url || "" }
    }
    setNewItem({ ...newItem, images: updatedImages })
  }

  // Handler for editing image files
  const handleEditImageFileChange = (index: number, file: File | null) => {
    const updatedFiles = [...editImageFiles]
    let previewUrl = ""

    if (file) {
      previewUrl = URL.createObjectURL(file)
      updatedFiles[index] = { ...updatedFiles[index], file, preview: previewUrl }
    } else {
      if (updatedFiles[index]?.preview) {
        URL.revokeObjectURL(updatedFiles[index].preview)
      }
      updatedFiles[index] = { ...updatedFiles[index], file: null, preview: "" }
    }

    setEditImageFiles(updatedFiles)

    // Update the editingItem's images state
    const updatedImages = [...editingItem.images]
    if (file) {
      updatedImages[index] = { ...updatedImages[index], url: previewUrl }
    } else {
      updatedImages[index] = { ...updatedImages[index], url: updatedImages[index]?.url || "" }
    }
    setEditingItem({ ...editingItem, images: updatedImages })
  }

  const addImage = () => {
    if (newItem.images.length < 4) {
      const isFirstImage = newItem.images.length === 0
      setNewItem({
        ...newItem,
        images: [...newItem.images, { url: "", is_primary: isFirstImage }],
      })
      setImageFiles([...imageFiles, { file: null, preview: "", is_primary: isFirstImage }])
    }
  }

  // Function to add image for editing
  const addEditImage = () => {
    if (editingItem.images.length < 4) {
      const isFirstImage = editingItem.images.length === 0
      setEditingItem({
        ...editingItem,
        images: [...editingItem.images, { url: "", is_primary: isFirstImage }],
      })
      setEditImageFiles([...editImageFiles, { file: null, preview: "", is_primary: isFirstImage }])
    }
  }

  const updateImage = (index: number, field: string, value: string | boolean) => {
    const updatedImages = [...newItem.images]
    updatedImages[index] = { ...updatedImages[index], [field]: value }

    // Si se marca como principal, desmarcar las demás
    if (field === "is_primary" && value === true) {
      updatedImages.forEach((img, i) => {
        if (i !== index) img.is_primary = false
      })

      // Actualizar también imageFiles
      const updatedFiles = [...imageFiles]
      updatedFiles.forEach((file, i) => {
        file.is_primary = i === index
      })
      setImageFiles(updatedFiles)
    }

    setNewItem({ ...newItem, images: updatedImages })
  }

  // Function to update image properties for editing
  const updateEditImage = (index: number, field: string, value: string | boolean) => {
    const updatedImages = [...editingItem.images]
    updatedImages[index] = { ...updatedImages[index], [field]: value }

    if (field === "is_primary" && value === true) {
      updatedImages.forEach((img, i) => {
        if (i !== index) img.is_primary = false
      })

      const updatedFiles = [...editImageFiles]
      updatedFiles.forEach((file, i) => {
        file.is_primary = i === index
      })
      setEditImageFiles(updatedFiles)
    }

    setEditingItem({ ...editingItem, images: updatedImages })
  }

  const removeImage = (index: number) => {
    // Limpiar URL de preview si existe
    if (imageFiles[index]?.preview) {
      URL.revokeObjectURL(imageFiles[index].preview)
    }

    const updatedImages = newItem.images.filter((_, i) => i !== index)
    const updatedFiles = imageFiles.filter((_, i) => i !== index)

    // Si se eliminó la imagen principal, hacer principal la primera
    if (updatedImages.length > 0 && !updatedImages.some((img) => img.is_primary)) {
      updatedImages[0].is_primary = true
      if (updatedFiles.length > 0) {
        updatedFiles[0].is_primary = true
      }
    }

    setNewItem({ ...newItem, images: updatedImages })
    setImageFiles(updatedFiles)
  }

  // Function to remove image for editing
  const removeEditImage = (index: number) => {
    if (editImageFiles[index]?.preview) {
      URL.revokeObjectURL(editImageFiles[index].preview)
    }

    const updatedImages = editingItem.images.filter((_, i) => i !== index)
    const updatedFiles = editImageFiles.filter((_, i) => i !== index)

    if (updatedImages.length > 0 && !updatedImages.some((img) => img.is_primary)) {
      updatedImages[0].is_primary = true
      if (updatedFiles.length > 0) {
        updatedFiles[0].is_primary = true
      }
    }

    setEditingItem({ ...editingItem, images: updatedImages })
    setEditImageFiles(updatedFiles)
  }

  const createMenuItem = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      console.log("[v0] Starting validation for menu item:", {
        name: newItem.name?.trim(),
        description: newItem.description?.trim(),
        price: newItem.price,
        imageFiles: imageFiles.length,
        existingImages: newItem.images.length,
      })

      // Validación del nombre
      if (!newItem.name.trim()) {
        console.log("[v0] Validation failed: Name is empty")
        toast({
          title: "Alerta",
          description: "El nombre del plato es obligatorio",
          variant: "destructive",
        })
        return
      }

      // Validación de la descripción
      if (!newItem.description.trim()) {
        console.log("[v0] Validation failed: Description is empty")
        toast({
          title: "Alerta",
          description: "La descripción del plato es obligatoria",
          variant: "destructive",
        })
        return
      }

      // Validación del precio principal
      if (!newItem.price || Number.parseFloat(newItem.price) <= 0) {
        console.log("[v0] Validation failed: Price is invalid:", newItem.price)
        toast({
          title: "Alerta",
          description: "El precio debe ser mayor que 0",
          variant: "destructive",
        })
        return
      }

      if (newItem.is_scheduled) {
        if (newItem.schedule_days.length === 0) {
          toast({
            title: "Alerta",
            description: "Debe seleccionar al menos un día para la programación",
            variant: "destructive",
          })
          return
        }

        if (!newItem.start_time || !newItem.end_time) {
          toast({
            title: "Alerta",
            description: "Debe especificar hora de inicio y fin para la programación",
            variant: "destructive",
          })
          return
        }

        if (newItem.start_time >= newItem.end_time) {
          toast({
            title: "Alerta",
            description: "La hora de fin debe ser mayor que la hora de inicio",
            variant: "destructive",
          })
          return
        }
      }

      // Validación de imágenes - debe tener al menos una
      if (imageFiles.length === 0 && newItem.images.length === 0) {
        console.log("[v0] Validation failed: No images provided")
        toast({
          title: "Alerta",
          description: "Todos los platos deben tener al menos una foto",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] All validations passed, proceeding with creation")

      // Validación de precios de variantes
      for (const variant of newItem.variants) {
        if (variant.price && Number.parseFloat(variant.price) <= 0) {
          toast({
            title: "Alerta",
            description: `El precio de la variante "${variant.name}" debe ser mayor que 0`,
            variant: "destructive",
          })
          return
        }
      }

      // Validación de precios de personalizaciones
      for (const customization of newItem.customizations) {
        if (customization.type === "paid" && (!customization.price || Number.parseFloat(customization.price) <= 0)) {
          toast({
            title: "Alerta",
            description: `El precio de la personalización "${customization.name}" debe ser mayor que 0`,
            variant: "destructive",
          })
          return
        }
      }

      const finalCategory = newItem.category === "Otras" ? newItem.category_custom : newItem.category

      const additionalAllergens = (newItem.additional_allergens || "")
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0)

      const allAllergens = [...(newItem.allergens || []), ...additionalAllergens]

      const processedImages = []
      for (let i = 0; i < imageFiles.length; i++) {
        const img = newItem.images[i]
        const fileData = imageFiles[i]

        if (fileData?.file) {
          try {
            console.log("[v0] Uploading new file:", fileData.file.name)
            const uploadedUrl = await uploadImageToSupabase(fileData.file)
            processedImages.push({
              url: uploadedUrl,
              is_primary: fileData.is_primary || img?.is_primary || false,
            })
          } catch (uploadError) {
            console.error("[v0] Error uploading image:", uploadError)
            toast({
              title: "Error",
              description: "Error al subir imagen. Intenta de nuevo.",
              variant: "destructive",
            })
            return
          }
        } else if (img?.url && !img.url.startsWith("blob:")) {
          // Existing image URL (not a blob)
          console.log("[v0] Keeping existing image:", img.url)
          processedImages.push(img)
        }
        // Skip blob URLs as they are temporary browser references
      }

      console.log("[v0] Creating menu item with data:", {
        name: newItem.name,
        category: finalCategory,
        images: processedImages.length,
      })

      const menuItemData = {
        name: newItem.name.trim(),
        category: finalCategory,
        price: Number.parseFloat(newItem.price),
        description: newItem.description.trim(),
        allergens: allAllergens,
        variants: newItem.variants.filter((v) => v.name.trim() && v.price),
        customizations: newItem.customizations.filter((c) => c.name.trim()),
        images: processedImages,
        is_available: newItem.is_available,
        is_featured: newItem.is_featured,
        is_gluten_free: newItem.is_gluten_free,
        is_vegan: newItem.is_vegan,
        is_vegetarian: newItem.is_vegetarian,
        is_scheduled:
          newItem.is_scheduled && newItem.schedule_days.length > 0 && newItem.start_time && newItem.end_time,
        schedule_days: newItem.is_scheduled ? newItem.schedule_days : null,
        start_time: newItem.is_scheduled ? newItem.start_time : null,
        end_time: newItem.is_scheduled ? newItem.end_time : null,
        nutritional_info: newItem.nutritional_info?.enabled ? newItem.nutritional_info : null,
      }

      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(menuItemData),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Menu item created successfully:", data)
        toast({
          title: "Éxito",
          description: "Plato creado correctamente",
        })
        resetForm()
        fetchData()
      } else {
        // Intentar obtener el mensaje de error del JSON, si no es posible usar mensaje genérico
        let errorMessage = "Error creating menu item"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // Si no se puede parsear como JSON, usar el status text
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }

        console.error("[v0] Error creating menu item:", errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Error creating menu item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error creating menu item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const createTable = async () => {
    try {
      const fullIdentifier = `Mesa: ${newTable.identifier.trim()}`

      // Check if identifier is unique
      const existingTable = tables.find(
        (table) => String(table.table_number || "").toLowerCase() === fullIdentifier.toLowerCase(),
      )

      if (existingTable) {
        toast({
          title: "Error",
          description: "Ya existe una mesa con ese identificador",
          variant: "destructive",
        })
        return
      }

      const location = newTable.location === "Otra" ? newTable.customLocation : newTable.location

      // </CHANGE> Fixed API payload to match server expectations
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: fullIdentifier, // Server expects 'number', not 'table_number'
          capacity: newTable.capacity,
          location: location, // Now sending location to API
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Mesa creada correctamente",
        })
        setShowCreateTableForm(false)
        setNewTable({
          identifier: "",
          location: "Salon principal",
          customLocation: "",
          capacity: 4,
        })
        fetchData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error creating table")
      }
    } catch (error) {
      console.error("Error creating table:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la mesa",
        variant: "destructive",
      })
    }
  }

  const validateAnnouncement = () => {
    if (!newAnnouncement.title.trim()) {
      toast({
        title: "Error",
        description: "El título es obligatorio",
        variant: "destructive",
      })
      return false
    }
    if (!newAnnouncement.content.trim()) {
      toast({
        title: "Error",
        description: "El contenido es obligatorio",
        variant: "destructive",
      })
      return false
    }
    // Additional validation for alert scheduling
    if (newAnnouncement.type === "alert" && newAnnouncement.is_scheduled) {
      if (newAnnouncement.schedule_days.length === 0) {
        toast({
          title: "Error",
          description: "Selecciona al menos un día para la programación de la alerta",
          variant: "destructive",
        })
        return false
      }
      if (!newAnnouncement.start_time || !newAnnouncement.end_time) {
        toast({
          title: "Error",
          description: "Define la hora de inicio y fin para la programación de la alerta",
          variant: "destructive",
        })
        return false
      }
      if (newAnnouncement.start_time >= newAnnouncement.end_time) {
        toast({
          title: "Error",
          description: "La hora de fin debe ser mayor que la hora de inicio",
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text.trim()) return ""

    try {
      // Extract emojis and preserve them
      const emojiRegex =
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
      const emojis: string[] = []
      let textWithPlaceholders = text

      // Replace emojis with placeholders
      textWithPlaceholders = text.replace(emojiRegex, (match) => {
        emojis.push(match)
        return `__EMOJI_${emojis.length - 1}__`
      })

      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textWithPlaceholders)}&langpair=es|${targetLang}`,
      )

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`)
      }

      const data = await response.json()
      let translatedText = data.responseData?.translatedText || text

      // Restore emojis in the translated text
      emojis.forEach((emoji, index) => {
        translatedText = translatedText.replace(`__EMOJI_${index}__`, emoji)
      })

      // For Chinese, ensure proper encoding and emoji preservation
      if (targetLang === "zh") {
        // Additional processing for Chinese to ensure emojis are preserved
        translatedText = translatedText.normalize("NFC")
      }

      return translatedText
    } catch (error) {
      console.error(`Translation error for ${targetLang}:`, error)
      return text // Return original text if translation fails
    }
  }

  // const removeStickersFromText = (text: string) => {
  //   // Remove all emoji characters using regex
  //   return text
  //     .replace(
  //       /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
  //       "",
  //     )
  //     .trim()
  // }

  // const removeSticker = (lang: string, field: "title" | "content", sticker: string) => {
  //   const currentText = translations[lang as keyof typeof translations][field]
  //   const updatedText = currentText.replace(new RegExp(sticker, "g"), "").replace(/\s+/g, " ").trim()
  //   updateTranslation(lang, field, updatedText)
  // }

  const createDraft = async () => {
    if (!validateAnnouncement()) return

    setIsTranslating(true)
    try {
      // Prepare announcement data
      const announcementData = {
        ...newAnnouncement,
        priority: Number.parseInt(newAnnouncement.priority),
        // Handle alert scheduling
        is_scheduled:
          newAnnouncement.type === "alert" &&
          newAnnouncement.schedule_days.length > 0 &&
          newAnnouncement.start_time &&
          newAnnouncement.end_time,
        schedule_days: newAnnouncement.type === "alert" ? newAnnouncement.schedule_days : null,
        start_time: newAnnouncement.type === "alert" ? newAnnouncement.start_time : null,
        end_time: newAnnouncement.type === "alert" ? newAnnouncement.end_time : null,
      }

      // Set original Spanish content
      const originalTranslations = {
        es: {
          title: announcementData.title,
          content: announcementData.content,
        },
      }

      // Generate translations for other languages if not an alert or if it's a scheduled alert
      let translatedContent = {
        en: { title: "", content: "" },
        de: { title: "", content: "" },
        fr: { title: "", content: "" },
        zh: { title: "", content: "" },
      }

      if (announcementData.type !== "alert" || announcementData.is_scheduled) {
        translatedContent = {
          en: {
            title: await translateText(announcementData.title, "en"),
            content: await translateText(announcementData.content, "en"),
          },
          de: {
            title: await translateText(announcementData.title, "de"),
            content: await translateText(announcementData.content, "de"),
          },
          fr: {
            title: await translateText(announcementData.title, "fr"),
            content: await translateText(announcementData.content, "fr"),
          },
          zh: {
            title: await translateText(announcementData.title, "zh"),
            content: await translateText(announcementData.content, "zh"),
          },
        }
      }

      setTranslations(translatedContent)
      setOriginalAnnouncement(originalTranslations.es)
      setShowTranslationPreview(true)
    } catch (error) {
      console.error("Error creating draft:", error)
      toast({
        title: "Error",
        description: "Error al generar las traducciones",
        variant: "destructive",
      })
    } finally {
      setIsTranslating(false)
    }
  }

  const publishAnnouncement = async () => {
    if (isPublishing) return

    setIsPublishing(true)
    try {
      const titleTranslations = {
        es: originalAnnouncement.title,
        en: translations.en.title,
        de: translations.de.title,
        fr: translations.fr.title,
        zh: translations.zh.title,
      }

      const contentTranslations = {
        es: originalAnnouncement.content,
        en: translations.en.content,
        de: translations.de.content,
        fr: translations.fr.content,
        zh: translations.zh.content,
      }

      const isScheduledAlert =
        newAnnouncement.type === "alert" &&
        newAnnouncement.schedule_days.length > 0 &&
        newAnnouncement.start_time &&
        newAnnouncement.end_time

      console.log("[v0] newAnnouncement state:", newAnnouncement)
      console.log("[v0] isScheduledAlert calculation:", isScheduledAlert)

      const announcementData = {
        title: originalAnnouncement.title, // Only Spanish version
        content: originalAnnouncement.content, // Only Spanish version
        title_translations: JSON.stringify(titleTranslations), // All translations
        content_translations: JSON.stringify(contentTranslations), // All translations
        type: newAnnouncement.type,
        priority: Number.parseInt(newAnnouncement.priority),
        end_date: newAnnouncement.end_date || null,
        is_active: newAnnouncement.is_active,
        ...(isScheduledAlert && {
          is_scheduled: true,
          schedule_days: newAnnouncement.schedule_days,
          start_time: newAnnouncement.start_time,
          end_time: newAnnouncement.end_time,
        }),
      }

      console.log("[v0] Publishing announcement with data:", announcementData)

      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(announcementData),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Anuncio publicado correctamente",
        })
        setNewAnnouncement({
          // Corrected setNewAnnouncement usage
          title: "",
          content: "",
          type: "general",
          priority: "1",
          end_date: "",
          is_active: true, // Reset is_active
          schedule_days: [],
          start_time: "",
          end_time: "",
          is_scheduled: false,
        })
        setShowTranslationPreview(false)
        setTranslations({
          en: { title: "", content: "" },
          de: { title: "", content: "" },
          fr: { title: "", content: "" },
          zh: { title: "", content: "" },
        })
        setOriginalAnnouncement({ title: "", content: "" }) // Reset original announcement
        fetchData()
      } else {
        throw new Error("Error publishing announcement")
      }
    } catch (error) {
      console.error("Error publishing announcement:", error)
      toast({
        title: "Error",
        description: "Error al publicar el anuncio",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Updated updateTranslation function to only update editable translations
  const updateTranslation = (lang: string, field: "title" | "content", value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang as keyof typeof prev],
        [field]: value,
      },
    }))
  }

  const createAnnouncement = async () => {
    if (!validateAnnouncement()) {
      return
    }

    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAnnouncement,
          priority: Number.parseInt(newAnnouncement.priority),
          end_date: newAnnouncement.end_date || null,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Anuncio creado",
        })
        setNewAnnouncement({
          // Corrected setNewAnnouncement usage
          title: "",
          content: "",
          type: "general",
          priority: "1",
          end_date: "",
          is_active: true, // Reset is_active
          schedule_days: [],
          start_time: "",
          end_time: "",
          is_scheduled: false,
        })
        fetchData()
      } else {
        throw new Error("Error creating announcement")
      }
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast({
        title: "Error",
        description: "Error al crear el anuncio",
        variant: "destructive",
      })
    }
  }

  const toggleAnnouncementStatus = async (announcementId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: `Anuncio ${!currentStatus ? "activado" : "desactivado"}`,
        })
        fetchData()
      } else {
        throw new Error("Error updating announcement")
      }
    } catch (error) {
      console.error("Error updating announcement:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el anuncio",
        variant: "destructive",
      })
    }
  }

  const deleteAnnouncement = async (announcementId: number) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Anuncio eliminado",
        })
        fetchData()
      } else {
        throw new Error("Error deleting announcement")
      }
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el anuncio",
        variant: "destructive",
      })
    }
  }

  const insertSticker = (sticker: string) => {
    const activeElement = document.activeElement as HTMLElement
    const activeId = activeElement?.id

    if (activeId === "announcement-title") {
      // Insert sticker in title field
      setNewAnnouncement({
        ...newAnnouncement,
        title: newAnnouncement.title + sticker,
      })
    } else {
      // Default to content field (including when content field is active)
      setNewAnnouncement({
        ...newAnnouncement,
        content: newAnnouncement.content + sticker,
      })
    }
  }

  const commonStickers = ["🍕", "🍔", "🍟", "🥗", "🍰", "☕", "🍷", "⭐", "🔥", "🎉", "💯", "👍", "🎊", "✨", "🌟"]

  const toggleWaiterCallStatus = async (callId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Atendida" ? "Pendiente" : "Atendida"

      const response = await fetch(`/api/waiter-calls/${callId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Estado de llamada actualizado",
        })
        fetchData()
      } else {
        throw new Error("Error updating waiter call")
      }
    } catch (error) {
      console.error("Error updating waiter call:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la llamada",
        variant: "destructive",
      })
    }
  }

  const deleteWaiterCall = async (callId: string) => {
    try {
      const response = await fetch(`/api/waiter-calls/${callId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Llamada eliminada",
        })
        fetchData()
      } else {
        throw new Error("Error deleting waiter call")
      }
    } catch (error) {
      console.error("Error deleting waiter call:", error)
      toast({
        title: "Error",
        description: "Error al eliminar la llamada",
        variant: "destructive",
      })
    }
  }

  const updateBillRequestStatus = async (requestId: number, status: string) => {
    try {
      const response = await fetch(`/api/bill-requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Solicitud de cuenta actualizada",
        })
        fetchData()
      } else {
        throw new Error("Error updating bill request")
      }
    } catch (error) {
      console.error("Error updating bill request:", error)
      toast({
        title: "Error",
        description: "Error al actualizar la solicitud",
        variant: "destructive",
      })
    }
  }

  const toggleFeaturedItem = async (itemId: number, isFeatured: boolean) => {
    try {
      if (isFeatured) {
        const response = await fetch("/api/menu/featured", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ item_id: itemId }),
        })

        if (response.ok) {
          toast({
            title: "Éxito",
            description: "Plato marcado como estrella",
          })
          fetchData()
        }
      } else {
        // Remove from featured (would need additional API endpoint)
        // For now, we'll assume an API endpoint exists for removal or handle it client-side if no API call is needed
        const response = await fetch(`/api/menu/featured/${itemId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          toast({
            title: "Éxito",
            description: "Plato removido de destacados",
          })
          fetchData()
        } else {
          throw new Error("Error removing featured item")
        }
      }
    } catch (error) {
      console.error("Error toggling featured item:", error)
      toast({
        title: "Error",
        description: "Error al actualizar plato estrella",
        variant: "destructive",
      })
    }
  }

  // Nueva función para activar/desactivar disponibilidad de plato
  const toggleItemAvailability = async (itemId: number, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/menu/items/${itemId}/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_available: isAvailable }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: `Plato ${isAvailable ? "activado" : "desactivado"} correctamente`,
        })
        fetchData()
      } else {
        throw new Error("Error updating item availability")
      }
    } catch (error) {
      console.error("Error updating item availability:", error)
      toast({
        title: "Error",
        description: "Error al actualizar la disponibilidad del plato",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "preparing":
        return "bg-orange-100 text-orange-800"
      case "ready":
        return "bg-green-100 text-green-800"
      case "served":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "occupied":
        return "bg-red-100 text-red-800"
      case "reserved":
        return "bg-yellow-100 text-yellow-800"
      case "maintenance":
        return "bg-gray-100 text-gray-800"
      case "blocked": // Added case for 'blocked' status
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCallTypeColor = (type: string) => {
    switch (type) {
      case "service":
        return "bg-blue-100 text-blue-800"
      case "bill":
        return "bg-green-100 text-green-800"
      case "complaint":
        return "bg-red-100 text-red-800"
      case "assistance":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 4:
        return "bg-red-500 text-white"
      case 3:
        return "bg-orange-500 text-white"
      case 2:
        return "bg-yellow-500 text-white"
      case 1:
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  const addVariant = () => {
    setNewItem({
      ...newItem,
      variants: [...newItem.variants, { name: "", price: "0" }],
    })
  }

  const removeVariant = (index: number) => {
    setNewItem({
      ...newItem,
      variants: newItem.variants.filter((_, i) => i !== index),
    })
  }

  const updateVariant = (index: number, field: string, value: string) => {
    const updatedVariants = [...newItem.variants]
    updatedVariants[index] = { ...updatedVariants[index], [field]: value }
    setNewItem({ ...newItem, variants: updatedVariants })
  }

  const addCustomization = () => {
    setNewItem({
      ...newItem,
      customizations: [...newItem.customizations, { name: "", type: "free", price: "0" }],
    })
  }

  const removeCustomization = (index: number) => {
    setNewItem({
      ...newItem,
      customizations: newItem.customizations.filter((_, i) => i !== index),
    })
  }

  const updateCustomization = (index: number, field: string, value: string) => {
    const updatedCustomizations = [...newItem.customizations]
    updatedCustomizations[index] = { ...updatedCustomizations[index], [field]: value }
    setNewItem({ ...newItem, customizations: updatedCustomizations })
  }

  // New functions for editing variants and customizations
  const addEditVariant = () => {
    setEditingItem({
      ...editingItem,
      variants: [...editingItem.variants, { name: "", price: "0" }],
    })
  }

  const removeEditVariant = (index: number) => {
    setEditingItem({
      ...editingItem,
      variants: editingItem.variants.filter((_, i) => i !== index),
    })
  }

  const updateEditVariant = (index: number, field: string, value: string) => {
    const updatedVariants = [...editingItem.variants]
    updatedVariants[index] = { ...updatedVariants[index], [field]: value }
    setEditingItem({ ...editingItem, variants: updatedVariants })
  }

  const addEditCustomization = () => {
    setEditingItem({
      ...editingItem,
      customizations: [...editingItem.customizations, { name: "", type: "free", price: "0" }],
    })
  }

  const removeEditCustomization = (index: number) => {
    setEditingItem({
      ...editingItem,
      customizations: editingItem.customizations.filter((_, i) => i !== index),
    })
  }

  const updateEditCustomization = (index: number, field: string, value: string) => {
    const updatedCustomizations = [...editingItem.customizations]
    updatedCustomizations[index] = { ...updatedCustomizations[index], [field]: value }
    setEditingItem({ ...editingItem, customizations: updatedCustomizations })
  }

  const deleteMenuItem = async (id: number) => {
    console.log("[v0] Starting direct deleteMenuItem for ID:", id)

    try {
      const response = await fetch(`/api/menu/items?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log("[v0] Delete API call successful, about to call fetchData")
        await fetchData()
        console.log("[v0] Menu item deleted successfully")
      } else {
        console.error("[v0] Failed to delete menu item")
      }
    } catch (error) {
      console.error("[v0] Error deleting menu item:", error)
    }
  }

  const deleteTable = async (tableId: number) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Mesa eliminada correctamente",
        })
        fetchData()
      } else {
        throw new Error("Error deleting table")
      }
    } catch (error) {
      console.error("Error deleting table:", error)
      toast({
        title: "Error",
        description: "Error al eliminar la mesa",
        variant: "destructive",
      })
    }
  }

  const toggleOrderSelection = (orderId: number) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const toggleSelectAllOrders = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map((order) => order.id)))
    }
  }

  const deleteSelectedOrders = async () => {
    if (selectedOrders.size === 0) return

    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedOrders.size} pedido(s)?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const deletePromises = Array.from(selectedOrders).map((orderId) =>
        fetch(`/api/orders/${orderId}`, {
          method: "DELETE",
        }),
      )

      const responses = await Promise.all(deletePromises)
      const failedDeletes = responses.filter((response) => !response.ok)

      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} orders`)
      }

      toast({
        title: "Éxito",
        description: `${selectedOrders.size} pedido(s) eliminado(s) correctamente`,
      })

      setSelectedOrders(new Set())
      fetchData()
    } catch (error) {
      console.error("Error deleting orders:", error)
      toast({
        title: "Error",
        description: "Error al eliminar los pedidos seleccionados",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando panel de administración...</div>
      </div>
    )
  }

  // Define daysOfWeek and handleDayToggle here
  const daysOfWeek = [
    { value: "monday", label: "Lunes" },
    { value: "tuesday", label: "Martes" },
    { value: "wednesday", label: "Miércoles" },
    { value: "thursday", label: "Jueves" },
    { value: "friday", label: "Viernes" },
    { value: "saturday", label: "Sábado" },
    { value: "sunday", label: "Domingo" },
  ]

  // Renamed handleDayToggle to handleAnnouncementDayToggle for clarity
  const handleAnnouncementDayToggle = (dayValue: string) => {
    setNewAnnouncement((prev) => {
      const isSelected = prev.schedule_days.includes(dayValue)
      const newScheduleDays = isSelected
        ? prev.schedule_days.filter((day) => day !== dayValue)
        : [...prev.schedule_days, dayValue]
      return { ...prev, schedule_days: newScheduleDays }
    })
  }

  const handleDishDayToggle = (dayValue: string) => {
    if (isEditing) {
      setEditingItem((prev) => {
        const isSelected = prev.schedule_days?.includes(dayValue) || false
        const newScheduleDays = isSelected
          ? prev.schedule_days?.filter((day) => day !== dayValue) || []
          : [...(prev.schedule_days || []), dayValue]
        return { ...prev, schedule_days: newScheduleDays }
      })
    } else {
      setNewItem((prev) => {
        const isSelected = prev.schedule_days.includes(dayValue)
        const newScheduleDays = isSelected
          ? prev.schedule_days.filter((day) => day !== dayValue)
          : [...prev.schedule_days, dayValue]
        return { ...prev, schedule_days: newScheduleDays }
      })
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <Button onClick={fetchData} disabled={isLoading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Cargando..." : "Actualizar"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative">
          {/* Desktop navigation - hidden on mobile */}
          <TabsList className="hidden md:grid w-full grid-cols-7">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="tables">Mesas</TabsTrigger>
            <TabsTrigger value="menu">Menú</TabsTrigger>
            <TabsTrigger value="announcements">Anuncios</TabsTrigger>
            <TabsTrigger value="waiter-calls">Llamadas</TabsTrigger>
            <TabsTrigger value="reviews">Valoraciones</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>

          <div className="md:hidden relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-0 z-10 h-10 w-8 p-0 bg-background/80 backdrop-blur-sm"
              onClick={() => {
                const container = document.getElementById("mobile-tabs-container")
                if (container) {
                  container.scrollBy({ left: -120, behavior: "smooth" })
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <TabsList
              id="mobile-tabs-container"
              className="flex overflow-x-auto scrollbar-hide px-8 py-2 gap-2 bg-transparent h-auto justify-start w-full"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <TabsTrigger value="orders" className="flex-shrink-0 whitespace-nowrap">
                Pedidos
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex-shrink-0 whitespace-nowrap">
                Mesas
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex-shrink-0 whitespace-nowrap">
                Menú
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex-shrink-0 whitespace-nowrap">
                Anuncios
              </TabsTrigger>
              <TabsTrigger value="waiter-calls" className="flex-shrink-0 whitespace-nowrap">
                Llamadas
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-shrink-0 whitespace-nowrap">
                Valoraciones
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-shrink-0 whitespace-nowrap">
                Estadísticas
              </TabsTrigger>
            </TabsList>

            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 z-10 h-10 w-8 p-0 bg-background/80 backdrop-blur-sm"
              onClick={() => {
                const container = document.getElementById("mobile-tabs-container")
                if (container) {
                  container.scrollBy({ left: 120, behavior: "smooth" })
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Pedidos</CardTitle>
                  <CardDescription>Administra todos los pedidos del restaurante</CardDescription>
                </div>
                {selectedOrders.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedOrders.size} pedido(s) seleccionado(s)
                    </span>
                    <Button variant="destructive" size="sm" onClick={deleteSelectedOrders} disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Eliminando..." : "Eliminar"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={orders.length > 0 && selectedOrders.size === orders.length}
                        onCheckedChange={toggleSelectAllOrders}
                        aria-label="Seleccionar todos los pedidos"
                      />
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Platos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, index) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                          aria-label={`Seleccionar pedido #${index + 1}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.table?.table_number || "N/A"}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="space-y-1">
                          {order.order_items?.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm">
                              <div className="font-medium">
                                {item.quantity}x {item.menu_item?.name || "Plato desconocido"}
                              </div>
                              {item.special_instructions && (
                                <div className="text-xs text-muted-foreground italic">
                                  Nota: {item.special_instructions}
                                </div>
                              )}
                            </div>
                          )) || <span className="text-muted-foreground">Sin items</span>}
                          {order.notes && (
                            <div className="text-xs text-orange-600 font-medium mt-2">
                              Notas generales: {order.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="preparing">Preparando</SelectItem>
                            <SelectItem value="ready">Listo</SelectItem>
                            <SelectItem value="served">Servido</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Mesas</CardTitle>
                  <CardDescription>Administra el estado de las mesas</CardDescription>
                </div>
                <Button onClick={() => setShowCreateTableForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Mesa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showCreateTableForm && (
                <Card className="mb-6 border-2 border-dashed border-blue-300">
                  <CardHeader>
                    <CardTitle className="text-lg">Crear Nueva Mesa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="identifier">Identificador</Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Mesa:</span>
                          <Input
                            id="identifier"
                            placeholder="Ej: 1, A2, VIP1"
                            value={newTable.identifier}
                            onChange={(e) => setNewTable({ ...newTable, identifier: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Se creará como "Mesa: {newTable.identifier || "[identificador]"}"
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacidad</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min="1"
                          max="20"
                          value={newTable.capacity}
                          onChange={(e) => setNewTable({ ...newTable, capacity: Number.parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Ubicación</Label>
                      <Select
                        value={newTable.location}
                        onValueChange={(value) => setNewTable({ ...newTable, location: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Salon principal">Salón principal</SelectItem>
                          <SelectItem value="Terraza">Terraza</SelectItem>
                          <SelectItem value="Otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newTable.location === "Otra" && (
                      <div>
                        <Label htmlFor="customLocation">Ubicación personalizada</Label>
                        <Input
                          id="customLocation"
                          placeholder="Máximo 20 palabras"
                          maxLength={100}
                          value={newTable.customLocation}
                          onChange={(e) => setNewTable({ ...newTable, customLocation: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={createTable} disabled={!newTable.identifier.trim()}>
                        Crear Mesa
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateTableForm(false)
                          setNewTable({
                            identifier: "",
                            location: "Salon principal",
                            customLocation: "",
                            capacity: 4,
                          })
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => (
                  <Card key={table.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{table.table_number}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTable(table.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{table.location || "Salón principal"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{table.capacity} personas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>2 sesiones activas</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Estado</Label>
                        <Select value={table.status} onValueChange={(value) => updateTableStatus(table.id, value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="occupied">Ocupada</SelectItem>
                            <SelectItem value="reserved">Reservada</SelectItem>
                            <SelectItem value="blocked">Bloquear</SelectItem>
                            <SelectItem value="maintenance">Mantenimiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                              <QrCode className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="text-xs text-gray-500">
                              <div>Código QR</div>
                              <div>Mesa {table.table_number}</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button variant="outline" size="sm" className="text-xs bg-transparent">
                              <Download className="h-3 w-3 mr-1" />
                              Solicitar
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs bg-transparent">
                              <Printer className="h-3 w-3 mr-1" />
                              Imprimir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? "Editar Plato" : "Crear Nuevo Plato"}</CardTitle>
                {isEditing && (
                  <Button variant="outline" onClick={cancelEdit} className="w-fit bg-transparent">
                    Cancelar Edición
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item-name">Nombre del Plato *</Label>
                    <Input
                      id="item-name"
                      value={isEditing ? editingItem?.name || "" : newItem.name}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 45)
                        if (isEditing) {
                          setEditingItem({ ...editingItem, name: value })
                        } else {
                          setNewItem({ ...newItem, name: value })
                        }
                      }}
                      placeholder="Nombre del plato"
                      maxLength={45}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {isEditing ? editingItem?.name?.length || 0 : newItem.name.length}/45 caracteres
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="item-category">Categoría *</Label>
                    <Select
                      value={isEditing ? editingItem?.category || "Otras" : newItem.category}
                      onValueChange={(value) => {
                        if (isEditing) {
                          setEditingItem({ ...editingItem, category: value })
                        } else {
                          setNewItem({ ...newItem, category: value })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="Otras">Otras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campo personalizado para "Otras" */}
                {(newItem.category === "Otras" || (isEditing && editingItem?.category === "Otras")) && (
                  <div>
                    <Label htmlFor="category-custom">Especificar Categoría *</Label>
                    <div className="space-y-1">
                      <Input
                        id="category-custom"
                        maxLength={45} // Add 45 character limit
                        value={isEditing ? editingItem?.category_custom || "" : newItem.category_custom}
                        onChange={(e) => {
                          const value = e.target.value.slice(0, 45) // Enforce limit in onChange
                          if (isEditing) {
                            setEditingItem({ ...editingItem, category_custom: value })
                          } else {
                            setNewItem({ ...newItem, category_custom: value })
                          }
                        }}
                        placeholder="Escribir categoría personalizada"
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {isEditing ? editingItem?.category_custom?.length || 0 : newItem.category_custom?.length || 0}
                        /45 caracteres
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label htmlFor="item-price">Precio (€) *</Label>
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      min="0" // Added min=0 to prevent negative prices
                      value={isEditing ? editingItem?.price?.toString() || "0" : newItem.price}
                      onChange={(e) => {
                        if (isEditing) {
                          setEditingItem({ ...editingItem, price: e.target.value })
                        } else {
                          setNewItem({ ...newItem, price: e.target.value })
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-3 pt-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="item-available"
                        checked={isEditing ? (editingItem?.is_available ?? true) : newItem.is_available}
                        onCheckedChange={(checked) => {
                          if (isEditing) {
                            setEditingItem({ ...editingItem, is_available: !!checked })
                          } else {
                            setNewItem({ ...newItem, is_available: !!checked })
                          }
                        }}
                      />
                      <Label htmlFor="item-available">Disponible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="item-scheduled"
                        checked={isEditing ? (editingItem?.is_scheduled ?? false) : newItem.is_scheduled}
                        onCheckedChange={(checked) => {
                          if (isEditing) {
                            setEditingItem({
                              ...editingItem,
                              is_scheduled: !!checked,
                              schedule_days: checked ? editingItem?.schedule_days || [] : [],
                              start_time: checked ? editingItem?.start_time || "" : "",
                              end_time: checked ? editingItem?.end_time || "" : "",
                            })
                          } else {
                            setNewItem({
                              ...newItem,
                              is_scheduled: !!checked,
                              schedule_days: checked ? newItem.schedule_days : [],
                              start_time: checked ? newItem.start_time : "",
                              end_time: checked ? newItem.end_time : "",
                            })
                          }
                        }}
                      />
                      <Label htmlFor="item-scheduled">Programar Plato</Label>
                    </div>
                  </div>
                </div>

                {((isEditing && editingItem?.is_scheduled) || (!isEditing && newItem.is_scheduled)) && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Programación del Plato
                      </Label>
                    </div>

                    <div>
                      <Label className="text-sm">Días de la semana</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {daysOfWeek.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dish-${day.value}`}
                              checked={
                                isEditing
                                  ? editingItem?.schedule_days?.includes(day.value) || false
                                  : newItem.schedule_days.includes(day.value)
                              }
                              onCheckedChange={() => handleDishDayToggle(day.value)}
                            />
                            <Label htmlFor={`dish-${day.value}`} className="text-sm">
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dish-start-time">Hora de inicio</Label>
                        <Input
                          id="dish-start-time"
                          type="time"
                          value={isEditing ? editingItem?.start_time || "" : newItem.start_time}
                          onChange={(e) => {
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                start_time: e.target.value,
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                start_time: e.target.value,
                              })
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dish-end-time">Hora de fin</Label>
                        <Input
                          id="dish-end-time"
                          type="time"
                          value={isEditing ? editingItem?.end_time || "" : newItem.end_time}
                          onChange={(e) => {
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                end_time: e.target.value,
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                end_time: e.target.value,
                              })
                            }
                          }}
                        />
                      </div>
                    </div>

                    {((isEditing &&
                      editingItem?.schedule_days?.length > 0 &&
                      editingItem?.start_time &&
                      editingItem?.end_time) ||
                      (!isEditing && newItem.schedule_days.length > 0 && newItem.start_time && newItem.end_time)) && (
                      <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                        <strong>Programación:</strong> Este plato estará disponible los{" "}
                        {(isEditing ? editingItem?.schedule_days || [] : newItem.schedule_days)
                          .map((day) => daysOfWeek.find((d) => d.value === day)?.label)
                          .join(", ")}{" "}
                        de {isEditing ? editingItem?.start_time : newItem.start_time} a{" "}
                        {isEditing ? editingItem?.end_time : newItem.end_time}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="item-featured"
                      checked={isEditing ? editingItem.is_featured : newItem.is_featured}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          setEditingItem({ ...editingItem, is_featured: !!checked })
                        } else {
                          setNewItem({ ...newItem, is_featured: !!checked })
                        }
                      }}
                    />
                    <Label htmlFor="item-featured">⭐ Estrella</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="item-gluten-free"
                      checked={isEditing ? editingItem.is_gluten_free : newItem.is_gluten_free}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          const updatedItem = { ...editingItem, is_gluten_free: !!checked }
                          if (checked) {
                            updatedItem.allergens = updatedItem.allergens.filter((a) => a !== "Gluten")
                          }
                          setEditingItem(updatedItem)
                        } else {
                          const updatedItem = { ...newItem, is_gluten_free: !!checked }
                          if (checked) {
                            updatedItem.allergens = updatedItem.allergens.filter((a) => a !== "Gluten")
                          }
                          setNewItem(updatedItem)
                        }
                      }}
                    />
                    <Label htmlFor="item-gluten-free">🌾 Sin Gluten</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="item-vegan"
                      checked={isEditing ? editingItem.is_vegan : newItem.is_vegan}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          const updatedItem = { ...editingItem, is_vegan: !!checked }
                          if (checked) {
                            const veganConflicts = ["Leche/Lactosa", "Huevo", "Pescado", "Crustáceos", "Moluscos"]
                            updatedItem.allergens = updatedItem.allergens.filter((a) => !veganConflicts.includes(a))
                          }
                          setEditingItem(updatedItem)
                        } else {
                          const updatedItem = { ...newItem, is_vegan: !!checked }
                          if (checked) {
                            const veganConflicts = ["Leche/Lactosa", "Huevo", "Pescado", "Crustáceos", "Moluscos"]
                            updatedItem.allergens = updatedItem.allergens.filter((a) => !veganConflicts.includes(a))
                          }
                          setNewItem(updatedItem)
                        }
                      }}
                    />
                    <Label htmlFor="item-vegan">🌱 Vegano</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="item-vegetarian"
                      checked={isEditing ? editingItem.is_vegetarian : newItem.is_vegetarian}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          const updatedItem = { ...editingItem, is_vegetarian: !!checked }
                          if (checked) {
                            const vegetarianConflicts = ["Pescado", "Crustáceos", "Moluscos"]
                            updatedItem.allergens = updatedItem.allergens.filter(
                              (a) => !vegetarianConflicts.includes(a),
                            )
                          }
                          setEditingItem(updatedItem)
                        } else {
                          const updatedItem = { ...newItem, is_vegetarian: !!checked }
                          if (checked) {
                            const vegetarianConflicts = ["Pescado", "Crustáceos", "Moluscos"]
                            updatedItem.allergens = updatedItem.allergens.filter(
                              (a) => !vegetarianConflicts.includes(a),
                            )
                          }
                          setNewItem(updatedItem)
                        }
                      }}
                    />
                    <Label htmlFor="item-vegetarian">🥬 Vegetariano</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="item-nutritional-info"
                      checked={
                        isEditing ? !!editingItem.nutritional_info?.enabled : !!newItem.nutritional_info?.enabled
                      }
                      onCheckedChange={(checked) => {
                        const hasNutritionalInfo = !!checked
                        setShowNutritionalInfo(hasNutritionalInfo)

                        const nutritionalData = {
                          energy_kj_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.energy_kj_100 || 0
                              : newItem.nutritional_info?.energy_kj_100 || 0
                            : 0,
                          energy_kcal_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.energy_kcal_100 || 0
                              : newItem.nutritional_info?.energy_kcal_100 || 0
                            : 0,
                          fat_g_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.fat_g_100 || 0
                              : newItem.nutritional_info?.fat_g_100 || 0
                            : 0,
                          saturates_g_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.saturates_g_100 || 0
                              : newItem.nutritional_info?.saturates_g_100 || 0
                            : 0,
                          carbs_g_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.carbs_g_100 || 0
                              : newItem.nutritional_info?.carbs_g_100 || 0
                            : 0,
                          sugars_g_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.sugars_g_100 || 0
                              : newItem.nutritional_info?.sugars_g_100 || 0
                            : 0,
                          protein_g_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.protein_g_100 || 0
                              : newItem.nutritional_info?.protein_g_100 || 0
                            : 0,
                          salt_g_100: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.salt_g_100 || 0
                              : newItem.nutritional_info?.salt_g_100 || 0
                            : 0,
                          basis: hasNutritionalInfo
                            ? isEditing
                              ? editingItem.nutritional_info?.basis || "per_100g"
                              : newItem.nutritional_info?.basis || "per_100g"
                            : "per_100g",
                          enabled: hasNutritionalInfo,
                        }

                        if (isEditing) {
                          setEditingItem({ ...editingItem, nutritional_info: nutritionalData })
                        } else {
                          setNewItem({ ...newItem, nutritional_info: nutritionalData })
                        }
                      }}
                    />
                    <Label htmlFor="item-nutritional-info">📊 Información Nutricional</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="item-description">Descripción *</Label>
                  <Textarea
                    id="item-description"
                    value={isEditing ? editingItem?.description || "" : newItem.description}
                    onChange={(e) => {
                      if (isEditing) {
                        setEditingItem({ ...editingItem, description: e.target.value })
                      } else {
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                    }}
                    placeholder="Descripción del plato"
                    rows={3}
                  />
                </div>

                {/* Alérgenos */}
                <div>
                  <Label>Alérgenos (selección múltiple)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {predefinedAllergens.map((allergen) => {
                      const currentItem = isEditing ? editingItem : newItem
                      const disabledAllergens = getDisabledAllergens(currentItem)
                      const isDisabled = disabledAllergens.has(allergen)

                      return (
                        <div key={allergen} className="flex items-center space-x-2">
                          <Checkbox
                            id={`allergen-${allergen}`}
                            checked={
                              isEditing
                                ? editingItem.allergens.includes(allergen)
                                : newItem.allergens.includes(allergen)
                            }
                            disabled={isDisabled}
                            onCheckedChange={(checked) => {
                              const currentAllergens = isEditing ? editingItem.allergens : newItem.allergens
                              const updatedAllergens = checked
                                ? [...currentAllergens, allergen]
                                : currentAllergens.filter((a) => a !== allergen)

                              if (isEditing) {
                                setEditingItem({ ...editingItem, allergens: updatedAllergens })
                              } else {
                                setNewItem({ ...newItem, allergens: updatedAllergens })
                              }
                            }}
                          />
                          <Label
                            htmlFor={`allergen-${allergen}`}
                            className={`text-sm ${isDisabled ? "text-gray-400 line-through" : ""}`}
                          >
                            {allergen}
                          </Label>
                        </div>
                      )
                    })}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allergen-otros"
                        checked={showOtherAllergens}
                        onCheckedChange={(checked) => {
                          setShowOtherAllergens(checked as boolean)
                          // Clear other allergens field when unchecking
                          if (!checked) {
                            if (isEditing) {
                              setEditingItem({ ...editingItem, additional_allergens: "" })
                            } else {
                              setNewItem({ ...newItem, additional_allergens: "" })
                            }
                          }
                        }}
                      />
                      <Label htmlFor="allergen-otros" className="text-sm">
                        Otros
                      </Label>
                    </div>
                  </div>

                  {showOtherAllergens && (
                    <div className="mt-2">
                      <Input
                        placeholder="Ej: cilantro, fresa..."
                        value={isEditing ? editingItem.additional_allergens : newItem.additional_allergens}
                        onChange={(e) => {
                          if (isEditing) {
                            setEditingItem({ ...editingItem, additional_allergens: e.target.value })
                          } else {
                            setNewItem({ ...newItem, additional_allergens: e.target.value })
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {(showNutritionalInfo ||
                  (isEditing && editingItem.nutritional_info?.enabled) ||
                  (!isEditing && newItem.nutritional_info?.enabled)) && (
                  <Card className="p-4 bg-gray-50">
                    <h4 className="font-semibold mb-3">Información Nutricional (por 100g/100ml)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="energy-kj">Energía (kJ)</Label>
                        <Input
                          id="energy-kj"
                          type="number"
                          min="0"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.energy_kj_100 || 0
                              : newItem.nutritional_info?.energy_kj_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: {
                                  ...editingItem.nutritional_info,
                                  energy_kj_100: value,
                                  enabled: true,
                                },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, energy_kj_100: value, enabled: true },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="energy-kcal">Energía (kcal)</Label>
                        <Input
                          id="energy-kcal"
                          type="number"
                          min="0"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.energy_kcal_100 || 0
                              : newItem.nutritional_info?.energy_kcal_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: {
                                  ...editingItem.nutritional_info,
                                  energy_kcal_100: value,
                                  enabled: true,
                                },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: {
                                  ...newItem.nutritional_info,
                                  energy_kcal_100: value,
                                  enabled: true,
                                },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="fat">Grasas (g)</Label>
                        <Input
                          id="fat"
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.fat_g_100 || 0
                              : newItem.nutritional_info?.fat_g_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: { ...editingItem.nutritional_info, fat_g_100: value, enabled: true },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, fat_g_100: value, enabled: true },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="saturates">Grasas Saturadas (g)</Label>
                        <Input
                          id="saturates"
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.saturates_g_100 || 0
                              : newItem.nutritional_info?.saturates_g_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: {
                                  ...editingItem.nutritional_info,
                                  saturates_g_100: value,
                                  enabled: true,
                                },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: {
                                  ...newItem.nutritional_info,
                                  saturates_g_100: value,
                                  enabled: true,
                                },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="carbs">Carbohidratos (g)</Label>
                        <Input
                          id="carbs"
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.carbs_g_100 || 0
                              : newItem.nutritional_info?.carbs_g_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: {
                                  ...editingItem.nutritional_info,
                                  carbs_g_100: value,
                                  enabled: true,
                                },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, carbs_g_100: value, enabled: true },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="sugars">Azúcares (g)</Label>
                        <Input
                          id="sugars"
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.sugars_g_100 || 0
                              : newItem.nutritional_info?.sugars_g_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: {
                                  ...editingItem.nutritional_info,
                                  sugars_g_100: value,
                                  enabled: true,
                                },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, sugars_g_100: value, enabled: true },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="protein">Proteínas (g)</Label>
                        <Input
                          id="protein"
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.protein_g_100 || 0
                              : newItem.nutritional_info?.protein_g_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: {
                                  ...editingItem.nutritional_info,
                                  protein_g_100: value,
                                  enabled: true,
                                },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, protein_g_100: value, enabled: true },
                              })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="salt">Sal (g)</Label>
                        <Input
                          id="salt"
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.salt_g_100 || 0
                              : newItem.nutritional_info?.salt_g_100 || 0
                          }
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value) || 0
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: { ...editingItem.nutritional_info, salt_g_100: value, enabled: true },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, salt_g_100: value, enabled: true },
                              })
                            }
                          }}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label htmlFor="basis">Base de cálculo</Label>
                        <Select
                          value={
                            isEditing
                              ? editingItem.nutritional_info?.basis || "per_100g"
                              : newItem.nutritional_info?.basis || "per_100g"
                          }
                          onValueChange={(value) => {
                            if (isEditing) {
                              setEditingItem({
                                ...editingItem,
                                nutritional_info: { ...editingItem.nutritional_info, basis: value, enabled: true },
                              })
                            } else {
                              setNewItem({
                                ...newItem,
                                nutritional_info: { ...newItem.nutritional_info, basis: value, enabled: true },
                              })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_100g">Por 100g</SelectItem>
                            <SelectItem value="per_100ml">Por 100ml</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Variantes */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Variantes del Plato</Label>
                    <Button type="button" variant="outline" size="sm" onClick={isEditing ? addEditVariant : addVariant}>
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Variante
                    </Button>
                  </div>
                  {(isEditing ? editingItem?.variants || [] : newItem.variants).map((variant, index) => (
                    <div key={index} className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Ej: 1/2 pollo, 2 pollos"
                        value={variant.name || ""}
                        onChange={(e) =>
                          isEditing
                            ? updateEditVariant(index, "name", e.target.value)
                            : updateVariant(index, "name", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0" // Added min=0 to prevent negative variant prices
                        placeholder="Precio adicional"
                        value={variant.price || ""}
                        onChange={(e) =>
                          isEditing
                            ? updateEditVariant(index, "price", e.target.value)
                            : updateVariant(index, "price", e.target.value)
                        }
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => (isEditing ? removeEditVariant(index) : removeVariant(index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Personalizaciones */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Opciones de Personalización</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={isEditing ? addEditCustomization : addCustomization}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Personalización
                    </Button>
                  </div>
                  {(isEditing ? editingItem?.customizations || [] : newItem.customizations).map(
                    (customization, index) => (
                      <div key={index} className="flex items-center gap-2 mt-2">
                        <Input
                          placeholder="Ej: Salsa BBQ, Extra de queso"
                          value={customization.name || ""}
                          className="text-sm md:text-xs"
                          onChange={(e) =>
                            isEditing
                              ? updateEditCustomization(index, "name", e.target.value)
                              : updateCustomization(index, "name", e.target.value)
                          }
                        />
                        <Select
                          value={customization.type}
                          onValueChange={(value) =>
                            isEditing
                              ? updateEditCustomization(index, "type", value)
                              : updateCustomization(index, "type", value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Gratis</SelectItem>
                            <SelectItem value="paid">Coste</SelectItem>
                          </SelectContent>
                        </Select>
                        {customization.type === "paid" && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0" // Added min=0 to prevent negative customization prices
                            placeholder="Precio"
                            value={customization.price || ""}
                            onChange={(e) =>
                              isEditing
                                ? updateEditCustomization(index, "price", e.target.value)
                                : updateCustomization(index, "price", e.target.value)
                            }
                            className="w-44" // Increased width from w-32 to w-44 (another 30% increase)
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => (isEditing ? removeEditCustomization(index) : removeCustomization(index))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ),
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Imágenes del Plato</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={isEditing ? addEditImage : addImage}
                      disabled={(isEditing ? editingItem.images.length : newItem.images.length) >= 4}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Imagen
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Máximo 4 imágenes (1 principal + 3 secundarias)
                  </div>
                  {(isEditing ? editingItem.images : newItem.images).map((image, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="space-y-2">
                        <Label>Cargar imagen desde archivo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            if (isEditing) {
                              handleEditImageFileChange(index, file)
                            } else {
                              handleImageFileChange(index, file)
                            }
                          }}
                          className="cursor-pointer"
                        />
                      </div>

                      <div className="text-sm text-muted-foreground text-center">o</div>

                      <div className="space-y-2">
                        <Label>URL de imagen</Label>
                        <Input
                          placeholder="https://ejemplo.com/imagen.jpg"
                          value={
                            (isEditing ? editImageFiles[index]?.file : imageFiles[index]?.file) ? "" : image.url || ""
                          }
                          onChange={(e) => {
                            if (isEditing) {
                              updateEditImage(index, "url", e.target.value)
                            } else {
                              updateImage(index, "url", e.target.value)
                            }
                          }}
                          disabled={!!(isEditing ? editImageFiles[index]?.file : imageFiles[index]?.file)}
                          className="flex-1"
                        />
                      </div>

                      {(image.url || (isEditing ? editImageFiles[index]?.preview : imageFiles[index]?.preview)) && (
                        <div className="space-y-2">
                          <Label>Previsualización</Label>
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                            <img
                              src={
                                isEditing
                                  ? editImageFiles[index]?.preview || image.url
                                  : imageFiles[index]?.preview || image.url
                              }
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/generic-unavailable-image.png"
                              }}
                            />
                            {image.is_primary && (
                              <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                Principal
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`primary-${index}`}
                            checked={image.is_primary}
                            onCheckedChange={(checked) => {
                              if (isEditing) {
                                updateEditImage(index, "is_primary", !!checked)
                              } else {
                                updateImage(index, "is_primary", !!checked)
                              }
                            }}
                          />
                          <Label htmlFor={`primary-${index}`} className="text-sm">
                            Imagen Principal
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => (isEditing ? removeEditImage(index) : removeImage(index))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(isEditing ? editingItem.images.length : newItem.images.length) >= 4 && (
                    <div className="text-sm text-amber-600 mt-1">Máximo de imágenes alcanzado (4)</div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm} className="flex-1 bg-transparent" type="button">
                    Limpiar
                  </Button>
                  <Button
                    onClick={isEditing ? updateMenuItem : createMenuItem}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? isEditing
                        ? "Actualizando..."
                        : "Guardando..."
                      : isEditing
                        ? "Actualizar Plato"
                        : "Guardar Plato"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platos del Menú</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar platos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={searchMenuItems} variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setSearchTerm("")
                      fetchData()
                    }}
                    variant="outline"
                  >
                    Limpiar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Disponible</TableHead>
                      <TableHead>Estrella</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.image_url && (
                              <img
                                src={item.image_url || "/placeholder.svg"}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {typeof item.category === "string" ? item.category : item.category?.name || "Sin categoría"}
                        </TableCell>
                        <TableCell>€{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_available ? "default" : "secondary"}>
                            {item.is_available ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.is_featured ? "default" : "outline"}>
                            {item.is_featured ? "★ Estrella" : "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              onClick={() => {
                                console.log("[v0] Edit button clicked for item:", item.id)
                                loadItemForEdit(item)
                              }}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-yellow-50"
                              onClick={() => {
                                console.log("[v0] Star button clicked for item:", item.id)
                                toggleFeaturedItem(item.id, !item.is_featured)
                              }}
                              title={item.is_featured ? "Quitar Estrella" : "Hacer Estrella"}
                            >
                              <Star
                                className={`h-4 w-4 ${item.is_featured ? "text-yellow-500 fill-yellow-500" : "text-yellow-600"}`}
                              />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-green-50"
                              onClick={() => {
                                console.log("[v0] Availability button clicked for item:", item.id)
                                toggleItemAvailability(item.id, !item.is_available)
                              }}
                              title={item.is_available ? "Desactivar" : "Activar"}
                            >
                              <Eye className={`h-4 w-4 ${item.is_available ? "text-green-600" : "text-gray-400"}`} />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50"
                              onClick={() => {
                                console.log("[v0] Delete button clicked for item:", item.id, item.name)
                                deleteMenuItem(item.id)
                              }}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Previsualización</CardTitle>
                <CardDescription>Vista previa de cómo se verá el plato</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Preview Card */}
                  <div className="border rounded-lg p-4 bg-card">
                    {/* Image Preview */}
                    <div className="aspect-video w-full mb-4 rounded-lg overflow-hidden bg-muted">
                      {(() => {
                        const currentItem = isEditing ? editingItem : newItem
                        const primaryImage = currentItem.images?.[0]?.url // Access url property

                        if (primaryImage) {
                          return (
                            <img
                              src={primaryImage || "/placeholder.svg"}
                              alt="Vista previa del plato"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `/placeholder.svg?height=200&width=300&query=plato de comida`
                              }}
                            />
                          )
                        }

                        return (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <div className="text-4xl mb-2">🍽️</div>
                              <div className="text-sm">Sin imagen</div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Dish Info */}
                    <div className="space-y-3">
                      {/* Name and Price */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {(() => {
                              const currentItem = isEditing ? editingItem : newItem
                              return currentItem.name || "Nombre del plato"
                            })()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {(() => {
                              const currentItem = isEditing ? editingItem : newItem
                              if (typeof currentItem.category === "string") {
                                return currentItem.category || "Categoría"
                              }
                              return currentItem.category?.name || "Categoría"
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">
                            €{(() => {
                              const currentItem = isEditing ? editingItem : newItem
                              const price =
                                typeof currentItem.price === "string"
                                  ? Number.parseFloat(currentItem.price) || 0
                                  : currentItem.price || 0
                              return price.toFixed(2)
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {(() => {
                        const currentItem = isEditing ? editingItem : newItem
                        if (currentItem.description) {
                          return <p className="text-sm text-muted-foreground">{currentItem.description}</p>
                        }
                        return null
                      })()}

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const currentItem = isEditing ? editingItem : newItem
                          const badges = []

                          if (currentItem.is_featured) {
                            badges.push(
                              <span
                                key="featured"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                              >
                                ⭐ Estrella
                              </span>,
                            )
                          }

                          if (!currentItem.is_available) {
                            badges.push(
                              <span
                                key="unavailable"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                              >
                                No disponible
                              </span>,
                            )
                          }

                          if (currentItem.is_gluten_free) {
                            badges.push(
                              <span
                                key="gluten-free"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                🌾 Sin Gluten
                              </span>,
                            )
                          }

                          if (currentItem.is_vegan) {
                            badges.push(
                              <span
                                key="vegan"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                🌱 Vegano
                              </span>,
                            )
                          }

                          if (currentItem.is_vegetarian) {
                            badges.push(
                              <span
                                key="vegetarian"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                🥬 Vegetariano
                              </span>,
                            )
                          }

                          // Add badge for scheduled dishes
                          if (
                            currentItem.is_scheduled &&
                            currentItem.schedule_days?.length > 0 &&
                            currentItem.start_time &&
                            currentItem.end_time
                          ) {
                            badges.push(
                              <span
                                key="scheduled"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                ⏰ Programado
                              </span>,
                            )
                          }

                          return badges
                        })()}
                      </div>

                      {/* Allergens */}
                      {(() => {
                        const currentItem = isEditing ? editingItem : newItem
                        const additionalAllergens = currentItem.additional_allergens
                          ? currentItem.additional_allergens
                              .split(",")
                              .map((a) => a.trim())
                              .filter((a) => a.length > 0)
                          : []
                        const allAllergens = [...(currentItem.allergens || []), ...additionalAllergens]

                        return allAllergens.length > 0 ? (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Alérgenos:</p>
                            <p className="text-xs">{allAllergens.join(", ")}</p>
                          </div>
                        ) : null
                      })()}

                      {/* Variants */}
                      {(() => {
                        const currentItem = isEditing ? editingItem : newItem
                        if (currentItem.variants && currentItem.variants.length > 0) {
                          return (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Variantes:</p>
                              <div className="space-y-1">
                                {currentItem.variants.map((variant, index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span>{variant.name}</span>
                                    <span className="font-medium">
                                      +€{Number.parseFloat(variant.price || "0").toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}

                      {/* Customizations */}
                      {(() => {
                        const currentItem = isEditing ? editingItem : newItem
                        if (currentItem.customizations && currentItem.customizations.length > 0) {
                          return (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Personalizaciones:</p>
                              <div className="space-y-1">
                                {currentItem.customizations.map((custom, index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span>{custom.name}</span>
                                    <span className="font-medium">
                                      {Number.parseFloat(custom.price || "0") > 0
                                        ? `+€${Number.parseFloat(custom.price || "0").toFixed(2)}`
                                        : "Gratis"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>

                  {/* Additional Images Preview */}
                  {(() => {
                    const currentItem = isEditing ? editingItem : newItem
                    const additionalImages = currentItem.images?.slice(1) || []

                    if (additionalImages.length > 0) {
                      return (
                        <div>
                          <p className="text-sm font-medium mb-2">Imágenes adicionales:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {additionalImages.map((image, index) => (
                              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={image.url || "/placeholder.svg"} // Access url property
                                  alt={`Imagen adicional ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = `/placeholder.svg?height=100&width=100&query=comida`
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Crear Anuncio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="announcement-title">Título *</Label>
                  <Input
                    id="announcement-title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="Título del anuncio"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="announcement-content">Contenido *</Label>
                  <Textarea
                    id="announcement-content"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Contenido del anuncio"
                    required
                  />
                </div>

                <div>
                  <Label>Stickers más utilizados</Label>
                  <div className="grid grid-cols-5 gap-1 p-2 border rounded-lg bg-muted/50">
                    {commonStickers.map((sticker, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 text-lg hover:bg-background p-0"
                        onClick={() => insertSticker(sticker)}
                        type="button"
                      >
                        {sticker}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="announcement-type">Tipo</Label>
                    <Select
                      value={newAnnouncement.type}
                      onValueChange={(value) =>
                        setNewAnnouncement({
                          ...newAnnouncement,
                          type: value,
                          schedule_days: value === "alert" ? newAnnouncement.schedule_days : [],
                          start_time: value === "alert" ? newAnnouncement.start_time : "",
                          end_time: value === "alert" ? newAnnouncement.end_time : "",
                          is_scheduled: value === "alert",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="promotion">Promoción</SelectItem>
                        <SelectItem value="special">Especial</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                        <SelectItem value="alert">Alerta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="announcement-priority">Prioridad</Label>
                    <Select
                      value={newAnnouncement.priority}
                      onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value })}
                      disabled={newAnnouncement.type === "alert"} // Disable priority for alerts
                    >
                      <SelectTrigger className={newAnnouncement.type === "alert" ? "opacity-50" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Baja</SelectItem>
                        <SelectItem value="2">Media</SelectItem>
                        <SelectItem value="3">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newAnnouncement.type === "alert" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <Label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Programación de Alerta
                      </Label>
                    </div>

                    <div>
                      <Label className="text-sm">Días de la semana</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {daysOfWeek.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={day.value}
                              checked={newAnnouncement.schedule_days.includes(day.value)}
                              onCheckedChange={() => handleAnnouncementDayToggle(day.value)}
                            />
                            <Label htmlFor={day.value} className="text-sm">
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time">Hora de inicio</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={newAnnouncement.start_time}
                          onChange={(e) =>
                            setNewAnnouncement({
                              ...newAnnouncement,
                              start_time: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time">Hora de fin</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={newAnnouncement.end_time}
                          onChange={(e) =>
                            setNewAnnouncement({
                              ...newAnnouncement,
                              end_time: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {newAnnouncement.schedule_days.length > 0 &&
                      newAnnouncement.start_time &&
                      newAnnouncement.end_time && (
                        <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                          <strong>Programación:</strong> Esta alerta se mostrará los{" "}
                          {newAnnouncement.schedule_days
                            .map((day) => daysOfWeek.find((d) => d.value === day)?.label)
                            .join(", ")}{" "}
                          de {newAnnouncement.start_time} a {newAnnouncement.end_time}
                        </div>
                      )}
                  </div>
                )}

                <Button onClick={createDraft} className="w-full" disabled={isTranslating}>
                  {isTranslating ? "Generando traducciones..." : "Crear Borrador"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anuncios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{getSpanishContent(announcement.title, announcement.title)}</h4>
                        <div className="flex gap-2">
                          <Badge variant="outline">{announcement.type}</Badge>
                          {announcement.type !== "alert" && ( // Hide priority for alerts
                            <Badge className={getPriorityColor(announcement.priority)}>
                              Prioridad {announcement.priority}
                            </Badge>
                          )}
                          <Badge variant={announcement.is_active ? "default" : "secondary"}>
                            {announcement.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {getSpanishContent(announcement.content, announcement.content)}
                      </p>

                      {/* Display scheduling info for alerts */}
                      {announcement.type === "alert" && announcement.is_scheduled && (
                        <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 p-2 rounded mb-3">
                          <strong>Programado:</strong>{" "}
                          {announcement.schedule_days
                            ?.map((day) => daysOfWeek.find((d) => d.value === day)?.label)
                            .join(", ")}{" "}
                          de {announcement.start_time} a {announcement.end_time}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                        >
                          {announcement.is_active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteAnnouncement(announcement.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {showTranslationPreview && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Previsualización de Traducciones</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowTranslationPreview(false)}>
                      ✕
                    </Button>
                  </div>

                  <Card className="mb-4 bg-muted/20">
                    <CardContent className="p-3">
                      <div className="text-sm text-muted-foreground mb-2">Anuncio Original (Español)</div>
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <span className="text-xs font-medium text-muted-foreground min-w-[60px]">Título:</span>
                          <span className="text-sm font-medium">{originalAnnouncement.title}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-medium text-muted-foreground min-w-[60px]">Contenido:</span>
                          <span className="text-sm">{originalAnnouncement.content}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {Object.entries(translations).map(([lang, translation]) => {
                      const languageNames = {
                        en: "English",
                        de: "Deutsch",
                        fr: "Français",
                        zh: "中文",
                      }

                      return (
                        <Card key={lang} className="border-muted">
                          <CardContent className="p-3">
                            <div className="text-sm font-medium mb-2">
                              {languageNames[lang as keyof typeof languageNames]} ({lang.toUpperCase()})
                            </div>
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">Título</Label>
                                <Input
                                  value={translation.title}
                                  onChange={(e) => updateTranslation(lang, "title", e.target.value)}
                                  placeholder="Título"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Contenido</Label>
                                <Textarea
                                  value={translation.content}
                                  onChange={(e) => updateTranslation(lang, "content", e.target.value)}
                                  placeholder="Contenido"
                                  rows={2}
                                  className="text-sm resize-none"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 mt-4 pt-3 border-t">
                    <Button variant="outline" onClick={() => setShowTranslationPreview(false)} className="flex-1 h-9">
                      Cancelar
                    </Button>
                    <Button onClick={publishAnnouncement} disabled={isPublishing} className="flex-1 h-9">
                      {isPublishing ? "Publicando..." : "Publicar Anuncio"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="waiter-calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Llamadas de Camarero
              </CardTitle>
              <CardDescription>Gestiona las solicitudes de servicio de las mesas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waiterCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">Mesa {call.table?.table_number || call.table_id}</TableCell>
                      <TableCell>
                        <Badge variant={call.tipo === "General" ? "secondary" : "outline"}>{call.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={call.status === "Atendida" ? "default" : "secondary"}
                          size="sm"
                          onClick={() => toggleWaiterCallStatus(call.id, call.status)}
                        >
                          {call.status}
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(call.created_at).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteWaiterCall(call.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Estadísticas de Valoraciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {simpleRatingStats && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{simpleRatingStats.average_rating.toFixed(1)}</div>
                      <div className="flex justify-center mb-2">
                        {renderStars(Math.round(simpleRatingStats.average_rating))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {simpleRatingStats.total_ratings} valoraciones
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-center">Distribución de Estrellas</div>
                      {Object.entries(simpleRatingStats.rating_distribution).map(([stars, count]) => (
                        <div key={stars} className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span>{stars}</span>
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Valoraciones Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {simpleRatings.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Usuario {rating.user_number}</span>
                          <span className="text-sm text-muted-foreground">{rating.table?.table_number}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {renderStars(rating.rating)}
                          <span className="ml-1 text-sm">{rating.rating}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {simpleRatings.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No hay valoraciones disponibles</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Updated stats tab with updated metrics */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mesas Ocupadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tables.filter((t) => t.status === "occupied").length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Llamadas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{waiterCalls.filter((c) => c.status === "Pendiente").length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valoración Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{simpleRatingStats?.average_rating.toFixed(1) || "0.0"}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AlertDialog removed for direct deletion testing */}
    </div>
  )
}

export default AdminPage
