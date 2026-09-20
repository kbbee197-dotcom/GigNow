import React, { useEffect, useState } from 'react';
import { ShieldCheck, UploadCloud } from 'lucide-react';
import { ID, Permission, Query, Role } from 'appwrite';
import { storage, tablesDB, DB_ID, DOCS_TABLE, DOCS_BUCKET, REVIEWS_TABLE } from '../../lib/appwrite';
import { useAuth } from '../../lib/AuthContext';

const DOC_TYPES = [
  { value: 'license_certification', label: 'License or certification' },
  { value: 'government_id', label: 'Government ID' },
];

type DocRow = { $id: string; docType: string; fileName: string };

export default function WorkerComplianceVault() {
  const { user } = useAuth();
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadDocs() {
    if (!user) return;
    try {
      const res = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: DOCS_TABLE,
        queries: [Query.equal('userId', user.$id), Query.orderDesc('$createdAt')],
      });
      setDocs(res.rows as unknown as DocRow[]);
      const rev = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: REVIEWS_TABLE,
        queries: [Query.equal('userId', user.$id)],
      });
      const map: Record<string, string> = {};
      for (const r of rev.rows as unknown as { documentId: string; decision: string }[]) map[r.documentId] = r.decision;
      setReviews(map);
    } catch {
      setError('Could not load your documents.');
    }
  }

  useEffect(() => {
    loadDocs();
  }, [user?.$id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    setError('');
    try {
      const perms = [Permission.read(Role.user(user.$id)), Permission.read(Role.label('admin'))];
      const uploaded = await storage.createFile({
        bucketId: DOCS_BUCKET,
        fileId: ID.unique(),
        file,
        permissions: perms,
      });
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: DOCS_TABLE,
        rowId: ID.unique(),
        data: { userId: user.$id, docType, fileId: uploaded.$id, fileName: file.name.slice(0, 255) },
        permissions: perms,
      });
      setFile(null);
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
        <ShieldCheck size={16} /> Global Compliance Security Vault
      </div>
      <h2 className="text-xl font-bold text-slate-900">Your documents</h2>
      <form onSubmit={handleUpload} className="p-4 border rounded-xl bg-slate-50 space-y-3">
        <select className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input key={docs.length} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={!file || busy} className="flex items-center gap-1 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">
          <UploadCloud size={14} /> {busy ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      <ul className="space-y-2">
        {docs.length === 0 && <li className="text-sm text-slate-400">No documents uploaded yet.</li>}
        {docs.map((d) => (
          <li key={d.$id} className="p-3 border rounded-xl text-sm flex flex-col gap-1">
            <span className="font-bold text-slate-800 break-all">{d.fileName}</span>
            <span className="text-xs text-slate-500">
              {DOC_TYPES.find((t) => t.value === d.docType)?.label ?? d.docType} · {reviews[d.$id] === 'approved' ? 'Approved' : reviews[d.$id] === 'rejected' ? 'Rejected - please upload a new one' : 'Awaiting review'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
