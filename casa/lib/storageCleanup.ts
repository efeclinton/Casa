import { supabase } from "./supabaseClient"

export async function cleanupUploadedPaths(
  bucketName: string,
  paths: string[],
  operation: string
) {
  if (paths.length === 0) return

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove(paths)

    if (error) {
      console.error(`Failed to clean up ${operation} uploads from ${bucketName}:`, {
        bucketName,
        paths,
        error,
      })
    }
  } catch (error) {
    console.error(`Unexpected cleanup failure for ${operation} uploads from ${bucketName}:`, {
      bucketName,
      paths,
      error,
    })
  }
}
