import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting image upload process")
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file provided in upload request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] File received:", { name: file.name, size: file.size, type: file.type })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const bucketName = "menu-images"
    console.log("[v0] Checking if bucket exists:", bucketName)

    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("[v0] Error listing buckets:", listError)
    } else {
      const bucketExists = buckets?.some((bucket) => bucket.name === bucketName)

      if (!bucketExists) {
        console.log("[v0] Bucket doesn't exist, creating it...")
        const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          fileSizeLimit: 5242880, // 5MB
        })

        if (createError) {
          console.error("[v0] Error creating bucket:", createError)
          return NextResponse.json(
            {
              error: "Failed to create storage bucket",
              details: createError.message,
            },
            { status: 500 },
          )
        }

        console.log("[v0] Bucket created successfully:", createData)
      } else {
        console.log("[v0] Bucket already exists")
      }
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `menu-images/${fileName}`

    console.log("[v0] Generated file path:", filePath)

    console.log("[v0] Attempting upload to bucket: menu-images")

    const { data, error } = await supabase.storage.from("menu-images").upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      console.error("[v0] Supabase upload error details:", error)
      return NextResponse.json(
        {
          error: "Failed to upload image",
          details: error.message || JSON.stringify(error),
        },
        { status: 500 },
      )
    }

    console.log("[v0] File uploaded successfully:", data)

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("menu-images").getPublicUrl(filePath)

    console.log("[v0] Generated public URL:", publicUrl)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
