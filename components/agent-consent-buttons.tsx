"use client";
import {useFormStatus} from 'react-dom';
import {FormBusy} from '@/components/action-busy';
import {Button} from '@/components/ui/button';
export function AgentConsentButtons(){const{pending}=useFormStatus();return <><FormBusy label="Connecting agent…"/><Button name="decision" value="approve" type="submit" disabled={pending}>Allow connection</Button><Button name="decision" value="deny" variant="outline" type="submit" disabled={pending}>Cancel</Button></>;}
