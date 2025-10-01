import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Users, ClipboardList, BarChart3, Calendar, Award, MessageCircle, BookOpen, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Teacher Portal & Classroom Dashboard - FabriiQ Documentation',
  description: 'Complete guide to using FabriiQ\'s teacher portal including classroom management, attendance tracking, gradebook, and AI teaching assistant.',
}

export default function ClassroomDashboardPage() {
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
            Teacher Portal & Classroom Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive guide to using FabriiQ's teacher portal for classroom management, 
            student tracking, and educational excellence.
          </p>
        </div>

        {/* Dashboard Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
          
          <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#D8E3E0' }}>
            <p className="mb-4" style={{ color: '#1F504B' }}>
              The Teacher Portal provides a centralized hub for all your teaching activities, 
              from managing multiple classes to tracking student progress and accessing AI-powered teaching assistance.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" style={{ color: '#1F504B' }}>
              <div>• Class overview cards</div>
              <div>• Quick attendance entry</div>
              <div>• Recent activity feed</div>
              <div>• Performance metrics</div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Features</h2>
          
          <div className="space-y-8">
            {/* Class Management */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Class Management</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Manage all your classes from a single interface with detailed student rosters and class-specific tools.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Class Overview</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View all assigned classes</li>
                    <li>• Student enrollment numbers</li>
                    <li>• Class schedules and timings</li>
                    <li>• Quick access to class activities</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Student Rosters</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Complete student information</li>
                    <li>• Contact details and photos</li>
                    <li>• Academic history</li>
                    <li>• Parent/guardian information</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Attendance Management */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-4">
                <ClipboardList className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Attendance Tracking</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Efficient attendance management with bulk operations, detailed reports, and automated notifications.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Daily Attendance</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Quick mark all present/absent</li>
                    <li>• Individual student status</li>
                    <li>• Late arrival tracking</li>
                    <li>• Absence reason codes</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Attendance Reports</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Weekly/monthly summaries</li>
                    <li>• Individual student reports</li>
                    <li>• Class attendance trends</li>
                    <li>• Export capabilities</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Gradebook & Assessments */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Gradebook & Assessments</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Comprehensive grading system with assessment creation, rubric-based evaluation, and detailed analytics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Grade Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Assignment grade entry</li>
                    <li>• Rubric-based grading</li>
                    <li>• Grade calculations</li>
                    <li>• Progress tracking</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Assessment Tools</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create assignments</li>
                    <li>• Quiz and test builder</li>
                    <li>• Submission management</li>
                    <li>• Feedback tools</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Teaching Assistant */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-4">
                <Zap className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>AI Teaching Assistant</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Get intelligent support for lesson planning, grading assistance, and teaching strategies.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Lesson Planning</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Curriculum-aligned suggestions</li>
                    <li>• Activity recommendations</li>
                    <li>• Resource suggestions</li>
                    <li>• Learning objective mapping</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Grading Support</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Automated feedback suggestions</li>
                    <li>• Rubric recommendations</li>
                    <li>• Grade consistency checks</li>
                    <li>• Performance insights</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Getting Started</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#1F504B' }}>First Time Setup</h3>
              <ol className="space-y-3" style={{ color: '#1F504B' }}>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>1</span>
                  <span>Log in to your teacher portal using your institutional credentials</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>2</span>
                  <span>Review your assigned classes and student rosters</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>3</span>
                  <span>Customize your dashboard preferences and notification settings</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>4</span>
                  <span>Explore the AI teaching assistant and available resources</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Practices</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Daily Workflow</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Start each day by reviewing your dashboard</li>
                <li>• Take attendance at the beginning of each class</li>
                <li>• Use quick actions for common tasks</li>
                <li>• Check AI assistant suggestions regularly</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Grading Efficiency</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Use rubrics for consistent grading</li>
                <li>• Leverage AI feedback suggestions</li>
                <li>• Grade assignments promptly</li>
                <li>• Provide meaningful feedback to students</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Student Engagement</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Monitor student progress regularly</li>
                <li>• Use gamification features effectively</li>
                <li>• Communicate with parents when needed</li>
                <li>• Celebrate student achievements</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Data Management</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Keep student records up to date</li>
                <li>• Regular backup of important data</li>
                <li>• Use analytics for insights</li>
                <li>• Maintain privacy and security</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Issues & Solutions</h2>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Cannot access a class</h4>
              <p className="text-gray-600 text-sm">
                Ensure you're assigned to the class and have the correct permissions. Contact your administrator if the issue persists.
              </p>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Attendance not saving</h4>
              <p className="text-gray-600 text-sm">
                Check your internet connection and ensure you click 'Save' after marking attendance. The system auto-saves every few minutes.
              </p>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>AI assistant not responding</h4>
              <p className="text-gray-600 text-sm">
                The AI assistant requires an active internet connection. Try refreshing the page or contact support if issues continue.
              </p>
            </div>
          </div>
        </section>

        {/* Related Documentation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Documentation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/resources/documentation/attendance-management"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Attendance Management</h3>
              <p className="text-gray-600">Detailed guide to attendance tracking and reporting features.</p>
            </Link>

            <Link
              href="/resources/documentation/grading-feedback"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Grading & Feedback</h3>
              <p className="text-gray-600">Learn about assessment tools and grading best practices.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
