import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Users, Settings, BookOpen, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Quick Start Guide - FabriiQ Documentation',
  description: 'Get started with FabriiQ platform setup, configuration, and initial deployment for your multi-campus institution.',
}

export default function QuickStartPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/resources/documentation"
            className="inline-flex items-center text-sm font-medium transition-colors"
            style={{ color: '#1F504B' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#5A8A84'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#1F504B'}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documentation
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Quick Start Guide
          </h1>
          <p className="text-lg text-gray-600">
            Get your FabriiQ platform up and running quickly with this step-by-step guide for 
            multi-campus educational institutions.
          </p>
        </div>

        {/* Prerequisites */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Prerequisites</h2>
          
          <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#D8E3E0' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#1F504B' }}>Before You Begin</h3>
            <ul className="space-y-2" style={{ color: '#1F504B' }}>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>Administrative access to your institution's systems</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>List of all campus locations and their specific requirements</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>Student and staff data for initial import</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>Curriculum and course structure information</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Setup Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Setup Steps</h2>
          
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3" style={{ backgroundColor: '#1F504B' }}>
                  1
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Initial System Configuration</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Set up your institution's basic information and configure the multi-campus architecture.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <Settings className="h-6 w-6 mb-2" style={{ color: '#5A8A84' }} />
                  <h4 className="font-semibold mb-2">Institution Setup</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Configure institution details</li>
                    <li>• Set up campus locations</li>
                    <li>• Define academic calendar</li>
                    <li>• Configure time zones</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <Users className="h-6 w-6 mb-2" style={{ color: '#5A8A84' }} />
                  <h4 className="font-semibold mb-2">User Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create admin accounts</li>
                    <li>• Set up role permissions</li>
                    <li>• Configure authentication</li>
                    <li>• Import user data</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3" style={{ backgroundColor: '#5A8A84' }}>
                  2
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Academic Structure Setup</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Configure your academic programs, courses, and curriculum structure across all campuses.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <BookOpen className="h-6 w-6 mb-2" style={{ color: '#5A8A84' }} />
                  <h4 className="font-semibold mb-2">Curriculum Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create academic programs</li>
                    <li>• Set up courses and subjects</li>
                    <li>• Define learning outcomes</li>
                    <li>• Configure assessment methods</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <Users className="h-6 w-6 mb-2" style={{ color: '#5A8A84' }} />
                  <h4 className="font-semibold mb-2">Class Organization</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create class sections</li>
                    <li>• Assign teachers to classes</li>
                    <li>• Enroll students</li>
                    <li>• Set up schedules</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3" style={{ backgroundColor: '#1F504B' }}>
                  3
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Portal Configuration</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Set up and customize the teacher and student portals for your institution's needs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <Users className="h-6 w-6 mb-2" style={{ color: '#5A8A84' }} />
                  <h4 className="font-semibold mb-2">Teacher Portal</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Configure dashboard layout</li>
                    <li>• Set up gradebook preferences</li>
                    <li>• Enable AI teaching assistant</li>
                    <li>• Configure communication tools</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <Award className="h-6 w-6 mb-2" style={{ color: '#5A8A84' }} />
                  <h4 className="font-semibold mb-2">Student Portal</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Set up gamification system</li>
                    <li>• Configure achievement badges</li>
                    <li>• Enable mobile access</li>
                    <li>• Set up parent communication</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3" style={{ backgroundColor: '#5A8A84' }}>
                  4
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Testing & Launch</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Test all system components and prepare for full deployment across your campuses.
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                  <span className="text-gray-600">Conduct user acceptance testing with key stakeholders</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                  <span className="text-gray-600">Train administrators, teachers, and support staff</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                  <span className="text-gray-600">Perform data migration and validation</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                  <span className="text-gray-600">Execute phased rollout across campuses</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Support Resources */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Support Resources</h2>
          
          <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Documentation</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/resources/documentation/user-management" className="text-sm transition-colors" style={{ color: '#5A8A84' }}>
                      User Management Guide →
                    </Link>
                  </li>
                  <li>
                    <Link href="/resources/documentation/system-config" className="text-sm transition-colors" style={{ color: '#5A8A84' }}>
                      System Configuration →
                    </Link>
                  </li>
                  <li>
                    <Link href="/resources/documentation/api-reference" className="text-sm transition-colors" style={{ color: '#5A8A84' }}>
                      API Reference →
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Support Channels</h3>
                <ul className="space-y-2" style={{ color: '#1F504B' }}>
                  <li className="text-sm">• Technical support team</li>
                  <li className="text-sm">• Implementation specialists</li>
                  <li className="text-sm">• Training resources</li>
                  <li className="text-sm">• Community forums</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What's Next?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/resources/documentation/user-management"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>User Management</h3>
              <p className="text-gray-600">Learn how to manage users, roles, and permissions across your campuses.</p>
            </Link>

            <Link
              href="/demo"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Schedule Demo</h3>
              <p className="text-gray-600">Book a personalized demonstration to see FabriiQ in action.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
