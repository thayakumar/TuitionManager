"use client";
import { useRef, useState } from "react";
import { Camera, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload-client";
import { updateStudentProfile } from "@/lib/student-profile-actions";
import { actionError, ActionValidationError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionBusy } from "@/components/action-busy";

export function StudentProfileForm({student}: {student:{name:string;phone:string|null;email:string|null;profile_photo_url?:string|null}}) {
  const [photo,setPhoto]=useState(student.profile_photo_url || ""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false),[progress,setProgress]=useState(0);
  const pending=useRef(false),router=useRouter();
  useActionBusy(busy,"Saving your profile…");
  async function choose(file?:File) {
    if (!file || pending.current) return;
    setError("");setSaved(false);setBusy(true);pending.current=true;
    try {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new ActionValidationError("Choose a PNG, JPEG, WebP or GIF image.");
      // Decode before uploading: reject corrupt images and preserve the selected file on failure.
      const bitmap=await createImageBitmap(file).catch(()=>{throw new ActionValidationError("This image could not be opened. Choose another image.")});
      bitmap.close();
      const uploaded=await uploadFile(file,{onProgress:setProgress,role:"student"});
      setPhoto(uploaded.inlineUrl || uploaded.fileUrl);
    } catch (e) {setError(actionError(e,"Your photo could not be uploaded. Please try again."))}
    finally {setBusy(false);pending.current=false}
  }
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(pending.current)return;
    const form=new FormData(e.currentTarget);form.set('profile_photo_url',photo);
    pending.current=true;setBusy(true);setSaved(false);setError("");
    try {const result=await updateStudentProfile(form);if(result.success){setSaved(true);router.refresh()}else setError(result.error || "Could not save your profile.")}
    catch(e){setError(actionError(e))}
    finally{pending.current=false;setBusy(false)}
  }
  return <form onSubmit={submit} className="space-y-6" aria-label="Edit my profile">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 text-primary">
        {photo ? <img src={photo} alt="Your profile photo" className="size-full object-cover"/> : <UserRound size={40}/>}
      </div>
      <div className="min-w-0 space-y-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 font-medium"><Camera size={18}/>Choose photo<input aria-label="Upload profile photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} className="sr-only" onChange={e=>{void choose(e.target.files?.[0]);e.target.value=''}}/></label>
        {photo && <button type="button" disabled={busy} onClick={()=>{setPhoto('');setSaved(false)}} className="ml-3 inline-flex min-h-11 items-center gap-1 text-sm"><X size={16}/>Remove photo</button>}
        <p className="text-sm text-muted-foreground">PNG, JPEG, WebP or GIF. Save changes to update your profile.</p>
      </div>
    </div>
    <div className="space-y-2"><label htmlFor="profile-name" className="font-medium">Full name</label><Input id="profile-name" name="name" defaultValue={student.name} required maxLength={160} disabled={busy}/></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><label htmlFor="profile-phone" className="font-medium">Phone</label><Input id="profile-phone" name="phone" type="tel" defaultValue={student.phone||''} maxLength={60} disabled={busy}/></div>
      <div className="space-y-2"><label htmlFor="profile-email" className="font-medium">Email</label><Input id="profile-email" name="email" type="email" defaultValue={student.email||''} maxLength={254} disabled={busy}/></div>
    </div>
    {busy && <p role="status" className="text-sm text-muted-foreground">Saving… {progress>0&&progress<100 ? progress+'%' : ''}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">Your profile has been updated.</p>}
    <Button type="submit" disabled={busy}>Save profile</Button>
  </form>
}
