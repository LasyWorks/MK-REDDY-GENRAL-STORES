export const metadata = {
  title: "Privacy Policy | MK Reddy General Stores",
  description: "Privacy policy for MK Reddy General Stores.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-gray-800">
      <h1 className="mb-4 text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-4 text-sm text-gray-600">Last updated: March 19, 2026</p>

      <section className="space-y-4 leading-7">
        <p>
          MK Reddy General Stores respects your privacy. We collect only the
          data needed to provide order, delivery, and account services.
        </p>
        <p>
          We may collect your name, phone number, email address, delivery
          address, and order history. Payment details are handled by trusted
          payment providers and are not stored as raw card data by us.
        </p>
        <p>
          Your information is used to process orders, provide support, improve
          service quality, and send essential account notifications.
        </p>
        <p>
          We do not sell your personal data. Information may be shared only
          with service providers required for operations, such as delivery,
          communication, and analytics.
        </p>
        <p>
          To request correction or deletion of your account data, contact us at
          <a className="ml-1 text-green-700 underline" href="mailto:mkreddygeneralstore@gmail.com">
            mkreddygeneralstore@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
