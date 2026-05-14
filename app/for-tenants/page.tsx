export const metadata = { title: "For tenants — ServiceFixes DHT" };

export default function ForTenantsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 prose prose-ink">
      <h1>For tenants</h1>
      <p>
        Submit service requests for your unit. ServiceFixes DHT keeps a record of what's been done so the next
        electrician shows up informed.
      </p>
      <ul>
        <li>Submit a request to your landlord — electrical, plumbing, HVAC, or other.</li>
        <li>See the status: open, acknowledged, in progress, resolved.</li>
        <li>You can <strong>not</strong> grant access to a trade — only the property owner can.</li>
      </ul>
    </div>
  );
}
