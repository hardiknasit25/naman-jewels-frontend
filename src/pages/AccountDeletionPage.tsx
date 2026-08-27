import { Link } from "react-router-dom";
import { Mail, Trash2, ShieldCheck, Clock } from "lucide-react";

export function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-gray-900">
            Naman Jewels
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <article>
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2">
            Account &amp; Data Deletion Request
          </h1>
          <p className="text-center text-sm text-gray-500 mb-10">
            Last updated: 27 August 2026 &middot; Applies to: Naman Jewels Dealer Platform (Website &amp; Mobile App)
          </p>

          <p className="text-[15px] leading-relaxed text-gray-800 mb-6">
            This page explains how registered dealers and business customers of{" "}
            <strong>Naman Jewels</strong> can request the deletion of their account and the
            associated business data stored on our platform. We are committed to handling every
            request responsibly and in compliance with applicable data protection laws.
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3 mt-8">
              <Trash2 className="w-5 h-5 text-red-500" />
              1. What you can request
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              As a registered dealer on the Naman Jewels platform, you may request:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                <strong>Full account deletion</strong> — your dealer account is permanently closed
                and all associated business data (company profile, contact details, inquiry records)
                is removed from our system.
              </li>
              <li>
                <strong>Partial data deletion</strong> — only specific data is removed (for
                example, your inquiry history or saved contact details) while your account remains
                active on the platform.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3 mt-8">
              <Mail className="w-5 h-5 text-blue-500" />
              2. How to submit a deletion request
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-4">
              Send an email to us using the registered email address linked to your dealer account:
            </p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 mb-4">
              <p className="text-[15px] leading-relaxed text-gray-800 mb-2">
                <strong>To:</strong>{" "}
                <a
                  href="mailto:admin@namanjewels.in?subject=Account%20Deletion%20Request"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  admin@namanjewels.in
                </a>
              </p>
              <p className="text-[15px] leading-relaxed text-gray-800 mb-2">
                <strong>Subject:</strong> Account Deletion Request
              </p>
              <p className="text-[15px] font-semibold text-gray-800 mb-2">
                Your email should include:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-[15px] leading-relaxed text-gray-800">
                <li>Your registered company name and email address or mobile number</li>
                <li>
                  Whether you want <em>full account deletion</em> or{" "}
                  <em>partial data deletion</em> (specify which data, if partial)
                </li>
                <li>A brief statement confirming you are the authorised account holder</li>
              </ul>
            </div>

            <p className="text-[15px] leading-relaxed text-gray-800">
              To prevent unauthorised deletion, our team may reach out to verify your identity
              before processing the request.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3 mt-8">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              3. What data will be deleted
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
              Upon a verified full-deletion request, the following data linked to your dealer
              account will be permanently removed from our system:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                Company profile details — company name, city, address, and reference information
              </li>
              <li>Contact information — registered email address and mobile number</li>
              <li>Login credentials and active session tokens</li>
              <li>
                All product inquiry records submitted by your account — including the jewellery
                pieces inquired about, quantities, remarks, and inquiry status history
              </li>
              <li>Customer type / dealer tier classification assigned to your account</li>
              <li>Account activity and login history</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3 mt-8">
              <Clock className="w-5 h-5 text-purple-500" />
              4. Timeline
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-gray-800">
              <li>
                <strong>Acknowledgement:</strong> We will confirm receipt of your request within
                3 business days.
              </li>
              <li>
                <strong>Verification:</strong> Our team may contact you to confirm the identity
                of the account holder before proceeding.
              </li>
              <li>
                <strong>Deletion:</strong> Your account and associated data will be permanently
                deleted within 30 days of successful verification.
              </li>
              <li>
                <strong>Backup purge:</strong> Any residual copies in encrypted system backups
                will be purged within 30–90 days.
              </li>
            </ul>

            <div className="my-6 rounded border-l-4 border-blue-500 bg-blue-50 px-5 py-3">
              <p className="text-[15px] leading-relaxed text-gray-800">
                <strong>Please note:</strong> Account deletion is permanent and cannot be undone.
                All inquiry records and product interest history associated with your dealer
                account will be lost. To rejoin the Naman Jewels platform, a fresh registration
                and approval will be required.
              </p>
            </div>
          </section>

          {/* Section 5 — Contact */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-3 mt-8">5. Contact us</h2>
            <p className="text-[15px] leading-relaxed text-gray-800 mb-4">
              For any questions about your dealer account or this deletion policy, contact our
              team:
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
                Privacy Policy:{" "}
                <Link to="/privacy-policy" className="text-blue-600 underline hover:text-blue-800">
                  /privacy-policy
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
