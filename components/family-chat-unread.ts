"use client";
import {useNotificationCounts} from '@/components/notification-context';
export function useUnreadFamilyChats(role:'admin'|'student'|'parent',_parentToken?:string){const counts=useNotificationCounts();return counts?.role===role&&(role!=='parent'||counts.parentToken===_parentToken)?counts.chatUnreadCount:0}
