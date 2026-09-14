import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Uploads a base64 data URL (or remote URL) to Cloudinary and returns the secure URL. */
export async function uploadToCloudinary(
  dataUrl: string,
  folder = "employee-evaluation/avatars"
): Promise<string> {
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: "image",
    overwrite: true,
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  });
  return result.secure_url;
}

export default cloudinary;
