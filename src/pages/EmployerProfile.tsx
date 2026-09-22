import { useEffect, useState } from 'react'
import { ID, Permission, Query, Role } from 'appwrite'
import { tablesDB, DB_ID, EMPLOYER_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'

type Profile = { $id: string; businessName: string; phone: string; status: string }

export default function EmployerProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!user) return
    try {
      const res = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: EMPLOYER_TABLE,
        queries: [Query.equal('employerId', user.$id), Query.limit(1)],
      })
      setProfile((res.rows[0] as unknown as Profile) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your profile')
    }
  }

  useEffect(() => {
    load()
  }, [user?.$id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: EMPLOYER_TABLE,
        rowId: ID.unique(),
        data: { employerId: user.$id, businessName: businessName.trim(), phone: phone.trim(), status: 'pending' },
        permissions: [Permission.read(Role.user(user.$id))],
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Business verification</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {profile ? (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1">
          <div className="font-bold text-slate-900">{profile.businessName}</div>
          <div className="text-sm text-slate-600">{profile.phone}</div>
          <div className="text-xs font-bold mt-2">
            {profile.status === 'approved' && <span className="text-emerald-700">Approved - you can post jobs</span>}
            {profile.status === 'pending' && <span className="text-amber-600">Pending review</span>}
            {profile.status === 'rejected' && <span className="text-red-600">Rejected - contact support</span>}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
          <p className="text-sm text-slate-600">Submit your business details before posting jobs. An admin will review this.</p>
          <input className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120} required />
          <input className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Contact phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} required />
          <button type="submit" disabled={busy} className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50">
            {busy ? 'Submitting...' : 'Submit for review'}
          </button>
        </form>
      )}
    </div>
  )
}
