"use server";

import { inquiriesRepository } from "@/lib/admin/repositories";
import { InquiryStatusUpdateSchema } from "../validators";
import { revalidatePath } from "next/cache";

/**
 * Server Action to update an inquiry's status (read, unread, archived).
 */
export async function updateInquiryStatusAction(formData: { id: string; status: "unread" | "read" | "archived" }) {
  const parsed = InquiryStatusUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const result = await inquiriesRepository.updateInquiryStatus(parsed.data.id, parsed.data.status);
  if (!result.success) {
    return { success: false, error: result.error || "Failed to update inquiry status" };
  }

  revalidatePath("/admin/inquiries");
  return { success: true };
}

/**
 * Server Action to fetch inquiries server-side.
 */
export async function getInquiriesAction(page = 1, pageSize = 10) {
  return await inquiriesRepository.getInquiries({ page, pageSize });
}
