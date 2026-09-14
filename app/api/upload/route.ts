import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { jsonError, jsonOk } from "@/lib/utils";

// POST { image: "data:image/png;base64,..." } -> { url }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return jsonError("An 'image' data URL is required.");
    }

    const url = await uploadToCloudinary(image);
    return jsonOk({ url });
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while uploading the image.", 500);
  }
}
