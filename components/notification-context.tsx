"use client";
import {createContext,useContext} from 'react';
export type NotificationCounts={role:'admin'|'student'|'parent';scope:string;unreadCount:number;chatUnreadCount:number;parentToken?:string}|null;
export const NotificationCountContext=createContext<NotificationCounts>(null);
export const useNotificationCounts=()=>useContext(NotificationCountContext);
