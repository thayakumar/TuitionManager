"use server";
import { mutateChat, ChatError, type ChatContext } from "./family-chat";
export async function sendFamilyChat(studentId:number,data:Parameters<typeof mutateChat>[1],context:ChatContext={}) {
  try{return await mutateChat(studentId,data,context)}catch(error){return {success:false,error:error instanceof ChatError?error.message:'Could not update chat. Your draft is still here.'}}
}
