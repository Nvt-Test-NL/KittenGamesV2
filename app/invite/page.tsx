"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Header from "../../components/Header"
import { getDb, getFirebaseAuth } from "../../lib/firebase/client"
import { addDoc, collection, doc, getDoc, query, serverTimestamp, updateDoc, where, getDocs } from "firebase/firestore"

export const dynamic = 'force-dynamic'
export const revalidate = 0

function InviteContent() {
  const router = useRouter()
  const params = useSearchParams()
  const db = getDb()
  const auth = getFirebaseAuth()
  const [status, setStatus] = useState<string>("Bezig met controleren…")
  const [waitingLogin, setWaitingLogin] = useState(false)

  useEffect(() => {
    const code = params?.get('code') || ''
    if (!code) { setStatus('Ongeldige of ontbrekende link.'); return }

    let unsub: any
    const proceed = async () => {
      const user = auth.currentUser
      if (!user) { setWaitingLogin(true); setStatus('Log eerst in om de uitnodiging te accepteren.'); return }
      setWaitingLogin(false)

      // find invite by code
      const qx = query(collection(db, 'invites'), where('code','==', code))
      const snaps = await getDocs(qx)
      if (snaps.empty) { setStatus('Uitnodiging niet gevonden of al gebruikt.'); return }
      const inviteDoc = snaps.docs[0]
      const inv = inviteDoc.data() as any
      if (inv.used) { setStatus('Uitnodiging is al gebruikt.'); return }
      const fromUid: string = inv.fromUid
      const me = user.uid
      if (!fromUid || !me || fromUid === me) { setStatus('Uitnodiging ongeldig.'); return }

      // create/find DM via pairKey
      const a = me < fromUid ? me : fromUid
      const b = me < fromUid ? fromUid : me
      const pairKey = `${a}_${b}`
      const qdm = query(collection(db, 'chats'), where('pairKey','==', pairKey), where('isGroup','==', false))
      const dmSnaps = await getDocs(qdm)
      let chatId: string
      if (!dmSnaps.empty) {
        chatId = dmSnaps.docs[0].id
      } else {
        const ref = await addDoc(collection(db, 'chats'), { isGroup: false, pairKey, members: [a,b], createdAt: serverTimestamp(), createdBy: me })
        chatId = ref.id
      }

      // mark invite used
      await updateDoc(doc(db, 'invites', inviteDoc.id), { used: true, usedAt: serverTimestamp(), usedBy: me })
      setStatus('Uitnodiging geaccepteerd. Doorsturen…')
      router.replace(`/chat?chat=${encodeURIComponent(chatId)}`)
    }

    // subscribe auth to proceed after login
    unsub = auth.onAuthStateChanged(() => { proceed().then(()=>{}).catch((e)=> setStatus(String(e?.message||e))) })

    // initial attempt
    proceed().catch((e)=> setStatus(String(e?.message||e)))

    return () => { if (typeof unsub === 'function') unsub() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <>
      <div className="text-sm text-gray-300">{status}</div>
      {waitingLogin && (
        <div className="mt-3 text-xs text-gray-400">Ga naar Settings en log in om door te gaan. Deze pagina refresht automatisch.</div>
      )}
    </>
  )
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="community" />
      <main className="container mx-auto px-4 pt-24 pb-10">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-gray-200">
          <div className="text-white font-semibold mb-1">Uitnodiging</div>
          <Suspense fallback={<div className="text-sm text-gray-400">Laden…</div>}>
            <InviteContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
