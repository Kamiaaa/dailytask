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

export interface UploadedProof {
  url: string;
  /** "image" for anything previewable inline, "file" for PDFs, docs, zips… */
  type: "image" | "file";
}

/**
 * Uploads task evidence. Unlike avatars this keeps the original file intact —
 * no crop, no overwrite — and accepts non-image types (PDF, docx, zip) via
 * `resource_type: "auto"`, which is what lets a reviewer open the real file.
 */
export async function uploadProofToCloudinary(
  dataUrl: string,
  folder = "employee-evaluation/proofs"
): Promise<UploadedProof> {
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: "auto",
    overwrite: false,
    // Cloudinary serves "raw" files under a non-guessable public id, but the
    // URL is still public — fine for task evidence, not for secrets.
    use_filename: true,
    unique_filename: true,
  });
  return {
    url: result.secure_url,
    type: result.resource_type === "image" ? "image" : "file",
  };
}

export default cloudinary;
