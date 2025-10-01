import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Monitor, Award, BarChart3, BookOpen, Target, Users, Calendar, Trophy } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Student Portal & Dashboard - FabriiQ Documentation',
  description: 'Complete guide to using FabriiQ\'s student portal including course management, assignments, grades, rewards system, and gamification features.',
}

export default function StudentDashboardPage() {
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
            Student Portal & Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive guide to using FabriiQ's student portal for course management, 
            assignment tracking, grade monitoring, and engaging with the gamification system.
          </p>
        </div>

        {/* Dashboard Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
          
          <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#D8E3E0' }}>
            <p className="mb-4" style={{ color: '#1F504B' }}>
              The Student Portal is your central hub for all academic activities, featuring a personalized dashboard 
              that shows your courses, assignments, grades, achievements, and progress in an engaging, gamified environment.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" style={{ color: '#1F504B' }}>
              <div>• Course overview cards</div>
              <div>• Assignment deadlines</div>
              <div>• Recent achievements</div>
              <div>• Progress tracking</div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Features</h2>
          
          <div className="space-y-8">
            {/* Course Management */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-4">
                <BookOpen className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Course Management</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Access all your enrolled courses with detailed information, materials, and class-specific dashboards.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Course Dashboard</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Course overview and syllabus</li>
                    <li>• Class schedule and timings</li>
                    <li>• Teacher information</li>
                    <li>• Course materials and resources</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Learning Progress</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Module completion tracking</li>
                    <li>• Learning objectives progress</li>
                    <li>• Time spent in course</li>
                    <li>• Performance analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Assignment Tracking */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-4">
                <Target className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Assignment Management</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Track all your assignments, submissions, and deadlines with intelligent reminders and progress monitoring.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Assignment Overview</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Upcoming assignments list</li>
                    <li>• Due date reminders</li>
                    <li>• Assignment instructions</li>
                    <li>• Submission requirements</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Submission Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• File upload and submission</li>
                    <li>• Draft saving capabilities</li>
                    <li>• Submission history</li>
                    <li>• Teacher feedback viewing</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Grades & Analytics */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Grades & Performance Analytics</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Monitor your academic performance with detailed grade tracking and insightful analytics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Grade Tracking</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time grade updates</li>
                    <li>• Assignment grade breakdown</li>
                    <li>• Course grade calculations</li>
                    <li>• Grade history and trends</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Performance Insights</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Strengths and improvement areas</li>
                    <li>• Comparison with class average</li>
                    <li>• Progress over time charts</li>
                    <li>• Goal achievement tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rewards & Gamification */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-4">
                <Award className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Rewards & Gamification System</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Engage with our comprehensive gamification system featuring points, levels, achievements, and rewards.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Points & Levels</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Earn points for activities</li>
                    <li>• Level progression system</li>
                    <li>• Experience point tracking</li>
                    <li>• Level-based rewards</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Achievements & Badges</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Achievement badge collection</li>
                    <li>• Milestone celebrations</li>
                    <li>• Special recognition badges</li>
                    <li>• Achievement sharing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gamification Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Gamification System</h2>
          
          <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#D8E3E0' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#1F504B' }}>How to Earn Points & Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3" style={{ color: '#1F504B' }}>Academic Activities</h4>
                <ul className="space-y-2 text-sm" style={{ color: '#1F504B' }}>
                  <li>• Complete assignments on time</li>
                  <li>• Achieve high grades on assessments</li>
                  <li>• Participate in class discussions</li>
                  <li>• Submit quality work</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3" style={{ color: '#1F504B' }}>Engagement Activities</h4>
                <ul className="space-y-2 text-sm" style={{ color: '#1F504B' }}>
                  <li>• Maintain perfect attendance</li>
                  <li>• Help classmates with learning</li>
                  <li>• Complete bonus challenges</li>
                  <li>• Show consistent improvement</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <Trophy className="h-8 w-8 mb-3" style={{ color: '#1F504B' }} />
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Achievement Badges</h4>
              <p className="text-sm text-gray-600">
                Unlock special badges for academic excellence, perfect attendance, participation, and other accomplishments.
              </p>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <Users className="h-8 w-8 mb-3" style={{ color: '#1F504B' }} />
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Class Leaderboards</h4>
              <p className="text-sm text-gray-600">
                Compete with classmates in friendly competition while celebrating everyone's achievements and progress.
              </p>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <Target className="h-8 w-8 mb-3" style={{ color: '#1F504B' }} />
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Personal Goals</h4>
              <p className="text-sm text-gray-600">
                Set and track personal learning goals with visual progress indicators and milestone celebrations.
              </p>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Getting Started</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#1F504B' }}>First Time Login</h3>
              <ol className="space-y-3" style={{ color: '#1F504B' }}>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>1</span>
                  <span>Log in using your student credentials provided by your institution</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>2</span>
                  <span>Explore your dashboard and familiarize yourself with the interface</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>3</span>
                  <span>Check your enrolled courses and upcoming assignments</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>4</span>
                  <span>Set up your profile and notification preferences</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Tips for Success */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tips for Academic Success</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Daily Habits</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Check your dashboard daily for updates</li>
                <li>• Review upcoming assignment deadlines</li>
                <li>• Track your progress regularly</li>
                <li>• Engage with gamification features</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Assignment Management</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Start assignments early</li>
                <li>• Use draft saving features</li>
                <li>• Read teacher feedback carefully</li>
                <li>• Ask questions when needed</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Grade Improvement</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Monitor your grade trends</li>
                <li>• Identify areas for improvement</li>
                <li>• Set realistic academic goals</li>
                <li>• Celebrate your achievements</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Engagement Tips</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Participate in class activities</li>
                <li>• Earn points through engagement</li>
                <li>• Help classmates when possible</li>
                <li>• Maintain consistent attendance</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Mobile Access */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Mobile Access</h2>
          
          <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
            <div className="flex items-center mb-4">
              <Monitor className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
              <h3 className="text-lg font-semibold" style={{ color: '#1F504B' }}>Access Anywhere, Anytime</h3>
            </div>
            <p className="mb-4" style={{ color: '#1F504B' }}>
              The student portal is fully responsive and optimized for mobile devices, allowing you to:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" style={{ color: '#1F504B' }}>
              <div>• Check assignments on-the-go</div>
              <div>• View grades instantly</div>
              <div>• Submit work from anywhere</div>
              <div>• Track achievements</div>
            </div>
          </div>
        </section>

        {/* Related Documentation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Documentation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/resources/documentation/achievement-system"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Achievement System</h3>
              <p className="text-gray-600">Learn more about our comprehensive gamification and rewards system.</p>
            </Link>

            <Link
              href="/resources/documentation/mobile-learning"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Mobile Learning</h3>
              <p className="text-gray-600">Discover how to make the most of mobile learning capabilities.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
