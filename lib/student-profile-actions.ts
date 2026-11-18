"use server";
import { getStudentSession } from "./auth";
import { withTransaction } from "./db";
import { text } from "./domain/validation";
import { driveFileId } from "./attachment-url";
import { ActionValidationError, actionError } from "./action-errors";
import { revalidatePath } from "next/cache";

export async function updateStudentProfile(form: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const studentId = await getStudentSession();
    if (!studentId) throw new ActionValidationError("Sign in to your student account before saving your profile.");
    const name = text(form.get("name"), "Name", 160, true);
    const phone = text(form.get("phone"), "Phone", 60);
    const email = text(form.get("email"), "Email", 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionValidationError("Enter a valid email address.");
    const photo = text(form.get("profile_photo_url"), "Profile photo", 2048);
    const photoId = photo ? driveFileId(photo) : null;
    if (photo && !photoId) throw new ActionValidationError("Upload a profile image using the photo button.");
    await withTransaction(async (tx) => {
      const student = await tx.execute({sql:"SELECT id FROM students WHERE id=? AND active=1",args:[studentId]});
      if (!student.rows.length) throw new ActionValidationError("Your student access is inactive.");
      if (photoId) {
        const file = await tx.execute({sql:"SELECT mime_type FROM uploaded_files WHERE file_id=? AND owner_role='student' AND owner_student_id=? AND parent_token_hash IS NULL",args:[photoId,studentId]});
        if (!file.rows.length || !/^image\/(png|jpeg|gif|webp)$/.test(String(file.rows[0].mime_type))) throw new ActionValidationError("Choose an image uploaded by your own student account.");
      }
      await tx.execute({sql:"UPDATE students SET name=?,phone=?,email=?,profile_photo_url=? WHERE id=?",args:[name,phone||null,email||null,photoId ? '/api/files/'+photoId+'?inline=1' : null,studentId]});
    });
    revalidatePath("/portal/student/"+studentId,"layout");
    revalidatePath("/students");
    revalidatePath("/students/"+studentId);
    revalidatePath("/share","layout");
    return {success:true};
  } catch (error) {
    return {success:false,error:actionError(error,"Your profile could not be saved. Your changes are still here; please try again.")};
  }
}
