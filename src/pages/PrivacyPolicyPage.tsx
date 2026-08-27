import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-gray-900">
            Naman Jewels
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/account-deletion" className="text-blue-600 hover:underline">
              Account Deletion
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <article>
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-center text-sm text-gray-500 mb-10">
            Last updated: 27 August 2026 &middot; Applies to: Naman Jewels Dealer Platform (Website &amp; Mobile App)
          </p>

          <p className="text-[15px] leading-relaxed text-gray-800 mb-6">
            At <strong>Naman Jewels</strong>, we operate a B2B jewellery platform that connects
            our admin team with registered dealers and business customers. This Privacy Policy
            explains what information we collect from dealers who register and use our platform,
            how the admin team uses that information, and how we protect it.
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              1. Information We Collect
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              When dealers register and use the Naman Jewels platform, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                <strong>Business &amp; contact details</strong> — company name, city, address,
                registered email address, and mobile number provided during registration.
              </li>
              <li>
                <strong>Reference information</strong> — the name of any person or dealer who
                referred your business to us, if provided.
              </li>
              <li>
                <strong>Account status &amp; dealer type</strong> — your account approval status
                (pending, active, blocked) and the dealer tier/customer type assigned by our
                admin team.
              </li>
              <li>
                <strong>Product inquiry data</strong> — the jewellery products you have inquired
                about, including product SKU, category, carat, quantity requested, any remarks
                submitted, and the status of each inquiry (New, Seen, Responded, Closed).
              </li>
              <li>
                <strong>Session &amp; activity data</strong> — login timestamps, session
                information, and device data used to secure your account and manage active
                sessions.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              2. How the Admin Team Uses Your Information
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              The Naman Jewels admin team uses the information collected to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                <strong>Review and approve dealer registrations</strong> — pending registrations
                are reviewed and either approved, rejected, or held for further verification.
              </li>
              <li>
                <strong>Manage dealer accounts</strong> — update dealer details, assign customer
                types/tiers, block or unblock accounts, and end active sessions when necessary.
              </li>
              <li>
                <strong>Process and respond to product inquiries</strong> — view inquiries linked
                to your account (product, quantity, remarks), update inquiry status, and follow
                up with your business.
              </li>
              <li>
                <strong>Maintain the jewellery catalogue</strong> — manage products (name, SKU,
                category, carat, weights, stone details, images) and categories to keep the
                platform catalogue accurate for dealers.
              </li>
              <li>
                <strong>Platform security</strong> — detect and prevent unauthorised access,
                manage session invalidation, and protect dealer accounts.
              </li>
              <li>
                <strong>Audit and compliance</strong> — maintain logs for admin actions and
                session activity as required for internal governance.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              3. How Dealer Data Is Stored
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              All dealer data entered into the Naman Jewels platform — including company profiles,
              contact details, inquiry records, and product data — is stored securely on our
              servers. Access to this data is restricted to authorised admin users only. We do
              not share dealer data with other dealers or with any unauthorised third parties.
            </p>
            <p className="text-[15px] leading-relaxed text-gray-800">
              The platform uses encrypted connections (HTTPS/TLS) for all data transmission
              between dealer devices and our servers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              4. Who Can Access Your Data
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              Your dealer data on the Naman Jewels platform can be accessed by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                <strong>Naman Jewels admin users</strong> — authorised staff who manage the
                platform, review registrations, process inquiries, and maintain the catalogue.
              </li>
              <li>
                <strong>The registered dealer themselves</strong> — through the Naman Jewels
                mobile app or website using their account credentials.
              </li>
              <li>
                <strong>Trusted technical service providers</strong> — cloud hosting, database,
                and infrastructure providers who store and process data on our behalf under
                strict confidentiality agreements. They do not use your data for any independent
                purpose.
              </li>
              <li>
                <strong>Legal or regulatory authorities</strong> — only when required by law,
                a court order, or a government directive.
              </li>
            </ul>
            <p className="text-[15px] leading-relaxed text-gray-800 mt-3">
              We do <strong>not</strong> sell dealer data or share it with marketing or
              advertising partners.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              5. Cookies &amp; Session Tracking
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800">
              The Naman Jewels platform uses essential cookies and session tokens to keep you
              logged in securely and maintain your session state while browsing the jewellery
              catalogue and submitting inquiries. These are strictly necessary for the platform
              to function and cannot be disabled without affecting usability. We do not use
              third-party advertising or tracking cookies on the dealer platform.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              6. Data Retention
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800">
              We retain dealer account data for as long as your account is active on the platform.
              If your account is deleted, personal and business data is removed within 30 days
              of a verified deletion request. Billing and transaction records are retained for
              up to 7 years for GST and legal compliance. Anonymised inquiry and catalogue
              analytics data that cannot be linked back to your account may be retained
              indefinitely for platform improvement. Full details are available on our{" "}
              <Link to="/account-deletion" className="text-blue-600 underline hover:text-blue-800">
                Account Deletion page
              </Link>
              .
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              7. Your Rights as a Dealer
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              As a registered dealer, you have the following rights over your data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                <strong>Access</strong> — request a summary of the business data we hold about
                your dealer account.
              </li>
              <li>
                <strong>Correction</strong> — contact us to update incorrect company details,
                contact information, or other account data.
              </li>
              <li>
                <strong>Deletion</strong> — request closure of your dealer account and removal
                of associated data (see{" "}
                <Link
                  to="/account-deletion"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Account Deletion
                </Link>
                ).
              </li>
              <li>
                <strong>Session control</strong> — you may log out of active sessions at any time
                through the app. Our admin team can also end your sessions remotely if your
                account is flagged for security reasons.
              </li>
            </ul>
            <p className="text-[15px] leading-relaxed text-gray-800 mt-3">
              To exercise any of these rights, email us at{" "}
              <a
                href="mailto:admin@namanjewels.in"
                className="text-blue-600 underline hover:text-blue-800"
              >
                admin@namanjewels.in
              </a>
              .
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">
              8. Changes to This Policy
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800">
              We may update this Privacy Policy when we make changes to the platform or to
              reflect updated legal requirements. The &quot;Last updated&quot; date at the top of
              this page will always reflect the most recent version. For significant changes,
              we will notify registered dealers via email or an in-app notification.
            </p>
          </section>

          {/* Section 9 — Contact */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">9. Contact Us</h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-4">
              If you have any questions about this Privacy Policy or how your dealer data is
              handled, please contact our team:
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <p className="text-[15px] font-bold text-gray-900 mb-2">Naman Jewels</p>
              <p className="text-[15px] leading-relaxed text-gray-800 mb-1">
                Email:{" "}
                <a
                  href="mailto:admin@namanjewels.in"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  admin@namanjewels.in
                </a>
              </p>
              <p className="text-[15px] leading-relaxed text-gray-800 mb-1">
                Account Deletion:{" "}
                <Link
                  to="/account-deletion"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  /account-deletion
                </Link>
              </p>
            </div>
          </section>

          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Naman Jewels. All rights reserved.
          </p>
        </article>
      </main>
    </div>
  );
}
