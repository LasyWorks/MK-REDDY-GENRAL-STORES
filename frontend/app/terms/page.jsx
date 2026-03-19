export const metadata = {
  title: "Terms of Service | MK Reddy General Stores",
  description: "Terms and conditions for MK Reddy General Stores.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-gray-800">
      <h1 className="mb-4 text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mb-4 text-sm text-gray-600">Last updated: March 19, 2026</p>

      <section className="space-y-4 leading-7">
        <p>
          By using MK Reddy General Stores services, you agree to these terms.
          Please use the platform only for lawful purchases and account usage.
        </p>
        <p>
          Product availability, pricing, and offers can change without prior
          notice. We make best efforts to keep listings accurate.
        </p>
        <p>
          Orders can be cancelled or adjusted if stock is unavailable or if
          there are pricing or technical issues.
        </p>
        <p>
          Users are responsible for providing accurate phone and address
          details for successful order fulfillment.
        </p>
        <p>
          For help with orders, refunds, or policy questions, contact us at
          <a className="ml-1 text-green-700 underline" href="mailto:mkreddygeneralstore@gmail.com">
            mkreddygeneralstore@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
