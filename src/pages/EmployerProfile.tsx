import { useEffect, useState } from 'react'
import { ID, Permission, Query, Role } from 'appwrite'
import { tablesDB, storage, DB_ID, EMPLOYER_TABLE, DOCS_BUCKET } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

type Profile = { $id: string; businessName: string; phone: string; status: string; entityType?: string; ein?: string; b2bStatus?: string }

export default function EmployerProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [entityType, setEntityType] = useState('llc')
  const [ein, setEin] = useState('')
  const [b2bFile, setB2bFile] = useState<File | null>(null)
  const [b2bBusy, setB2bBusy] = useState(false)
  const [b2bError, setB2bError] = useState('')

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

  async function submitB2b(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !b2bFile) return
    setB2bBusy(true)
    setB2bError('')
    try {
      const uploaded = await storage.createFile({
        bucketId: DOCS_BUCKET,
        fileId: ID.unique(),
        file: b2bFile,
        permissions: [Permission.read(Role.user(user.$id))],
      })
      await callAction({ type: 'submit_b2b', entityType, ein, fileId: uploaded.$id })
      setB2bFile(null)
      await load()
    } catch (err) {
      setB2bError(err instanceof Error ? err.message : 'Could not submit')
    } finally {
      setB2bBusy(false)
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

      {profile && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
          <h3 className="font-bold text-slate-900">Business entity verification</h3>
          <p className="text-xs text-slate-500">Required to post jobs in states with stricter contractor-classification rules (currently CA, MA, NJ). Upload an EIN confirmation letter, Articles of Organization, or similar.</p>
          <div className="text-xs font-bold">
            {(!profile.b2bStatus || profile.b2bStatus === 'none') && <span className="text-slate-400">Not submitted</span>}
            {profile.b2bStatus === 'pending' && <span className="text-amber-600">Pending review</span>}
            {profile.b2bStatus === 'verified' && <span className="text-emerald-700">Verified</span>}
            {profile.b2bStatus === 'rejected' && <span className="text-red-600">Rejected - you may resubmit below</span>}
          </div>
          {profile.b2bStatus !== 'verified' && profile.b2bStatus !== 'pending' && (
            <form onSubmit={submitB2b} className="space-y-2">
              <select className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                <option value="llc">LLC</option>
                <option value="corp">Corporation</option>
                <option value="sole_prop">Sole Proprietorship</option>
              </select>
              <input className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="EIN" value={ein} onChange={(e) => setEin(e.target.value)} maxLength={20} required />
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setB2bFile(e.target.files?.[0] ?? null)} className="w-full text-sm" required />
              {b2bError && <p className="text-sm text-red-600">{b2bError}</p>}
              <button type="submit" disabled={b2bBusy || !b2bFile} className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50">
                {b2bBusy ? 'Submitting...' : 'Submit for B2B verification'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
