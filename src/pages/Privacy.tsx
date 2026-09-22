export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4 text-sm text-slate-700">
      <h1 className="text-2xl font-black text-slate-900">Privacy Policy</h1>
      <p className="text-xs text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">What we collect</h2>
      <p>When you create a GigNow account, we collect your name, email address, and whether you're signing up as a worker or an employer. Depending on how you use GigNow, we may also collect:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Documents you upload for compliance review, such as licenses, certifications, or a government ID.</li>
        <li>Your device's GPS location at the moment you clock in or out of a shift, used only to confirm you were at the job site.</li>
        <li>Business details submitted by employers for verification, such as business name and phone number.</li>
        <li>Job postings, applications, hiring records, and shift and pay records.</li>
      </ul>

      <h2 className="text-lg font-bold text-slate-900 pt-2">How we use it</h2>
      <p>We use this information to operate the marketplace: to create and secure your account, connect workers and employers, verify compliance documents and business identity, confirm clock-ins at job sites, and calculate pay. Some job postings are drafted with the help of an AI service (Google's Gemini) to suggest a description and a fair pay range; the employer can edit or discard any suggestion before posting.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Who can see your information</h2>
      <p>Compliance documents and IDs are private and reviewed only by GigNow administrators. Employers can see information about workers they've hired for a specific job, such as name and shift records. We do not sell your personal information to third parties.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Where it's stored</h2>
      <p>GigNow's data is stored with Appwrite, a cloud database and authentication provider. Job-description assistance is processed by Google's Gemini AI service. We do not currently process payments; pay amounts shown in the app are records, not live money transfers.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Your choices</h2>
      <p>You can review the compliance documents you've uploaded and their review status in your account. To request deletion of your account or data, or to ask any question about this policy, contact us using the information below.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Contact us</h2>
      <p>Questions about this policy or your data can be directed to GigNow support. [Contact information to be added.]</p>
    </div>
  )
}
