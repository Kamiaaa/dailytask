import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadToCloudinary, uploadProofToCloudinary } from "@/lib/cloudinary";
import { jsonError, jsonOk } from "@/lib/utils";

// POST { image: "data:image/png;base64,…" }                     -> { url }            (avatar, square-cropped)
// POST { file: "data:application/pdf;base64,…", kind: "proof" } -> { url, type }      (task evidence, untouched)
//
// `kind` defaults to "avatar" so existing avatar callers keep working unchanged.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB, matched by the client-side check

/** Approximate decoded size of a base64 data URL, without decoding it. */
function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const kind = body.kind === "proof" ? "proof" : "avatar";
    const payload: unknown = kind === "proof" ? body.file ?? body.image : body.image;

    if (!payload || typeof payload !== "string" || !payload.startsWith("data:")) {
      return jsonError(
        kind === "proof" ? "A 'file' data URL is required." : "An 'image' data URL is required."
      );
    }

    if (dataUrlBytes(payload) > MAX_BYTES) {
      return jsonError("That file is larger than 10 MB. Please attach something smaller.", 413);
    }

    if (kind === "proof") {
      const proof = await uploadProofToCloudinary(payload);
      return jsonOk(proof);
    }

    const url = await uploadToCloudinary(payload);
    return jsonOk({ url });
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while uploading the file.", 500);
  }
}
