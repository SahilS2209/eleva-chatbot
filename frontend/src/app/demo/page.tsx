'use client';

import ChatWidget from '../widget/page';

/**
 * Demo page showing how the chat widget looks embedded on the
 * Elements HR Services company website.
 */
export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Simulated Company Website Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Elements HR Services</h1>
          <nav className="flex gap-6 text-sm">
            <a href="#" className="hover:text-blue-200">Home</a>
            <a href="#" className="hover:text-blue-200">Services</a>
            <a href="#" className="hover:text-blue-200">About</a>
            <a href="#" className="hover:text-blue-200">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Complete HR Solutions for Your Business
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            From payroll management to recruitment, compliance, and employee onboarding —
            we handle all your HR needs so you can focus on growing your business.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800">
              Our Services
            </button>
            <button className="border border-blue-900 text-blue-900 px-6 py-3 rounded-lg hover:bg-blue-50">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 container mx-auto px-6">
        <h3 className="text-2xl font-bold text-center mb-12">Our Services</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Payroll Management', desc: 'Accurate and timely payroll processing with full statutory compliance.' },
            { title: 'Recruitment & Staffing', desc: 'End-to-end recruitment solutions from sourcing to onboarding.' },
            { title: 'Compliance & Statutory', desc: 'PF, ESI, PT, and all statutory compliance handled seamlessly.' },
            { title: 'Employee Onboarding', desc: 'Smooth onboarding experience with documentation and training.' },
            { title: 'HR Policy Drafting', desc: 'Custom HR policies aligned with your company culture and legal requirements.' },
            { title: 'Background Verification', desc: 'Thorough background checks for all new hires.' },
          ].map((service, idx) => (
            <div key={idx} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-lg mb-2">{service.title}</h4>
              <p className="text-gray-600 text-sm">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-6 text-center text-sm">
          <p>© 2025 Elements HR Services, Gurgaon. All rights reserved.</p>
          <p className="mt-2">📍 Gurgaon, Haryana | 📞 +91-XXXXXXXXXX | ✉️ info@elementshr.com</p>
        </div>
      </footer>

      {/* Embedded Chat Widget */}
      <ChatWidget />
    </div>
  );
}
