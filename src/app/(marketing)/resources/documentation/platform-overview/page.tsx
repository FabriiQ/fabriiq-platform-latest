import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Users, BookOpen, Award, BarChart3, Settings, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Platform Overview - FabriiQ Documentation',
  description: 'Comprehensive overview of FabriiQ\'s multi-campus educational platform including core features, architecture, and capabilities.',
}

export default function PlatformOverviewPage() {
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
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Documentation
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Platform Overview
          </h1>
          <p className="text-lg text-gray-600">
            FabriiQ is a comprehensive educational platform that integrates Student Information System (SIS) 
            and Learning Experience Platform (LXP) capabilities specifically designed for multi-campus institutions.
          </p>
        </div>

        {/* Core Components */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Platform Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border-2 rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <Users className="h-8 w-8 mb-4" style={{ color: '#1F504B' }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Multi-Campus SIS</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive student information system with centralized management and campus-specific customization.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Student enrollment and lifecycle management</li>
                <li>• Fee management and payment processing</li>
                <li>• Academic records and transcript management</li>
                <li>• Campus-specific configurations</li>
              </ul>
            </div>

            <div className="border-2 rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <BookOpen className="h-8 w-8 mb-4" style={{ color: '#1F504B' }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Learning Experience Platform</h3>
              <p className="text-gray-600 mb-4">
                Advanced LXP with curriculum management, assessments, and personalized learning experiences.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Curriculum and course management</li>
                <li>• Assessment creation and grading</li>
                <li>• Bloom's taxonomy integration</li>
                <li>• Learning analytics and insights</li>
              </ul>
            </div>

            <div className="border-2 rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <Award className="h-8 w-8 mb-4" style={{ color: '#1F504B' }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Gamification System</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive rewards and achievement system to boost student engagement and motivation.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Points and levels system</li>
                <li>• Achievement badges and milestones</li>
                <li>• Class leaderboards</li>
                <li>• Interactive challenges</li>
              </ul>
            </div>

            <div className="border-2 rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <BarChart3 className="h-8 w-8 mb-4" style={{ color: '#1F504B' }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Analytics & Reporting</h3>
              <p className="text-gray-600 mb-4">
                Real-time analytics and comprehensive reporting across all platform components.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Student performance analytics</li>
                <li>• Teacher effectiveness metrics</li>
                <li>• Campus operational insights</li>
                <li>• Financial reporting</li>
              </ul>
            </div>
          </div>
        </section>

        {/* User Portals */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">User Portals</h2>
          
          <div className="space-y-6">
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Teacher Portal</h3>
              <p className="text-gray-600 mb-3">
                Comprehensive dashboard for educators with classroom management, attendance tracking, 
                assessment tools, and AI-powered teaching assistance.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>• Class management</div>
                <div>• Attendance tracking</div>
                <div>• Gradebook</div>
                <div>• AI teaching assistant</div>
              </div>
            </div>

            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Student Portal</h3>
              <p className="text-gray-600 mb-3">
                Engaging learning platform with course access, assignment management, grade tracking, 
                and gamified learning experiences.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>• Course dashboard</div>
                <div>• Assignment tracking</div>
                <div>• Grade analytics</div>
                <div>• Rewards system</div>
              </div>
            </div>

            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Admin Portal</h3>
              <p className="text-gray-600 mb-3">
                Comprehensive administrative interface for system configuration, user management, 
                and institutional oversight.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>• User management</div>
                <div>• System configuration</div>
                <div>• Campus management</div>
                <div>• Analytics dashboard</div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Platform Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Multi-Campus Architecture</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Centralized institutional management</li>
                <li>• Campus-specific customizations</li>
                <li>• Real-time data synchronization</li>
                <li>• Unified reporting across campuses</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>AI-Powered Features</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Teaching assistant for educators</li>
                <li>• Personalized learning recommendations</li>
                <li>• Automated grading assistance</li>
                <li>• Predictive analytics</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Mobile-First Design</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Responsive web application</li>
                <li>• Offline capabilities</li>
                <li>• Touch-optimized interfaces</li>
                <li>• Cross-platform compatibility</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Integration Capabilities</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Third-party system integration</li>
                <li>• API-first architecture</li>
                <li>• Data import/export tools</li>
                <li>• Single sign-on (SSO) support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Technology Foundation</h2>
          
          <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Frontend</h3>
                <ul className="text-sm space-y-1" style={{ color: '#1F504B' }}>
                  <li>• Next.js 14</li>
                  <li>• React 18</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Backend</h3>
                <ul className="text-sm space-y-1" style={{ color: '#1F504B' }}>
                  <li>• Node.js</li>
                  <li>• tRPC</li>
                  <li>• Prisma ORM</li>
                  <li>• PostgreSQL</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Infrastructure</h3>
                <ul className="text-sm space-y-1" style={{ color: '#1F504B' }}>
                  <li>• Cloud-native architecture</li>
                  <li>• Scalable deployment</li>
                  <li>• Security-first design</li>
                  <li>• Real-time capabilities</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Next Steps</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/resources/documentation/quick-start"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Quick Start Guide</h3>
              <p className="text-gray-600">Get started with FabriiQ platform setup and configuration.</p>
            </Link>

            <Link
              href="/resources/documentation/api-reference"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>API Reference</h3>
              <p className="text-gray-600">Explore our comprehensive API documentation and integration guides.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
