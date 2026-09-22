export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4 text-sm text-slate-700">
      <h1 className="text-2xl font-black text-slate-900">Terms of Service</h1>
      <p className="text-xs text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">What GigNow is</h2>
      <p>GigNow is a technology platform that connects workers and employers for gig and shift-based work. GigNow is a software intermediary; it does not employ workers or guarantee work, pay, or job quality.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Accounts and eligibility</h2>
      <p>You must provide accurate information when creating an account. Employers must submit business information for verification and may not post jobs until approved. Workers may be asked to submit compliance documents, such as licenses, certifications, or identification, before being eligible for certain jobs.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Clock-in and location</h2>
      <p>When clocking in or out of a shift, GigNow checks your device's GPS location against the job's location to confirm you are at the job site. You must allow location access to use this feature.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Pay and fees</h2>
      <p>Employers set an hourly pay rate for each job. GigNow calculates a service fee based on industry, deducted from the gross pay to determine the worker's net pay. Pay records are kept in the app; GigNow does not currently process or transmit payments.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">AI-assisted features</h2>
      <p>GigNow may use AI tools to suggest job descriptions and pay ranges. These suggestions are drafts only; employers are responsible for reviewing and editing them before posting.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Conduct</h2>
      <p>You agree not to submit false information, impersonate another person or business, or use GigNow for any unlawful purpose. GigNow may suspend or remove accounts that violate these terms.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Limitation of liability</h2>
      <p>GigNow is provided "as is." To the fullest extent permitted by law, GigNow is not liable for disputes between workers and employers, for the accuracy of AI-generated suggestions, or for indirect or consequential damages arising from use of the platform.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Changes to these terms</h2>
      <p>We may update these terms from time to time. Continued use of GigNow after changes means you accept the updated terms.</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Contact us</h2>
      <p>Questions about these terms can be directed to GigNow support. [Contact information to be added.]</p>
    </div>
  )
}
