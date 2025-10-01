import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Award, Trophy, Target, Users, BarChart3, Gift, Zap, Star } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Achievement System & Gamification - FabriiQ Documentation',
  description: 'Complete guide to FabriiQ\'s comprehensive gamification system including points, levels, achievements, badges, leaderboards, and rewards.',
}

export default function AchievementSystemPage() {
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
            Achievement System & Gamification
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive guide to FabriiQ's gamification system designed to boost student engagement, 
            motivation, and academic success through points, levels, achievements, and rewards.
          </p>
        </div>

        {/* System Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
          
          <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#D8E3E0' }}>
            <p className="mb-4" style={{ color: '#1F504B' }}>
              FabriiQ's achievement system transforms learning into an engaging adventure by rewarding students 
              for academic excellence, participation, and positive behaviors. The system includes multiple 
              interconnected components that work together to create a motivating learning environment.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" style={{ color: '#1F504B' }}>
              <div>• Points & Levels</div>
              <div>• Achievement Badges</div>
              <div>• Class Leaderboards</div>
              <div>• Reward System</div>
            </div>
          </div>
        </section>

        {/* Core Components */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Gamification Components</h2>
          
          <div className="space-y-8">
            {/* Points & Levels */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-4">
                <Star className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Points & Levels System</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Students earn points for various activities and achievements, progressing through levels that unlock new rewards and recognition.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Point Earning Activities</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Completing assignments (10-50 points)</li>
                    <li>• Perfect attendance (25 points/day)</li>
                    <li>• High grades on assessments (grade %)</li>
                    <li>• Class participation (5-15 points)</li>
                    <li>• Helping classmates (10 points)</li>
                    <li>• Bonus challenges (20-100 points)</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Level Progression</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Level 1: 0-100 points (Beginner)</li>
                    <li>• Level 2: 101-250 points (Learner)</li>
                    <li>• Level 3: 251-500 points (Scholar)</li>
                    <li>• Level 4: 501-1000 points (Expert)</li>
                    <li>• Level 5: 1001+ points (Master)</li>
                    <li>• Special recognition at each level</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-4">
                <Award className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Achievement Badges</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Special badges awarded for specific accomplishments, milestones, and exceptional performance across different categories.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Academic Excellence</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Perfect Score - 100% on assessment</li>
                    <li>• Knowledge Master - Complete all modules</li>
                    <li>• Quick Learner - Fast completion</li>
                    <li>• Consistent Performer - High grades</li>
                    <li>• Subject Expert - Excellence in subject</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Participation & Engagement</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Active Participant - Regular participation</li>
                    <li>• Discussion Leader - Lead discussions</li>
                    <li>• Helpful Peer - Assist classmates</li>
                    <li>• Question Master - Ask great questions</li>
                    <li>• Team Player - Excellent collaboration</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Leaderboards */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#1F504B' }}>
              <div className="flex items-center mb-4">
                <Trophy className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Class Leaderboards</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Friendly competition through class-based leaderboards that showcase top performers while celebrating everyone's progress.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Leaderboard Categories</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Overall points ranking</li>
                    <li>• Weekly top performers</li>
                    <li>• Most improved students</li>
                    <li>• Perfect attendance streak</li>
                    <li>• Assignment completion rate</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Recognition Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Top 3 highlighted positions</li>
                    <li>• Progress celebration for all</li>
                    <li>• Weekly achievement spotlights</li>
                    <li>• Positive reinforcement focus</li>
                    <li>• Class-wide celebrations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rewards System */}
            <div className="border-l-4 pl-6" style={{ borderColor: '#5A8A84' }}>
              <div className="flex items-center mb-4">
                <Gift className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
                <h3 className="text-xl font-semibold" style={{ color: '#1F504B' }}>Reward System</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Students can redeem earned points for various rewards, privileges, and recognition opportunities.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Virtual Rewards</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Profile customization options</li>
                    <li>• Special avatar accessories</li>
                    <li>• Exclusive badge collections</li>
                    <li>• Dashboard themes</li>
                    <li>• Achievement showcases</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
                  <h4 className="font-semibold mb-2">Privileges & Recognition</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Student of the week recognition</li>
                    <li>• Special privileges in class</li>
                    <li>• Leadership opportunities</li>
                    <li>• Certificate generation</li>
                    <li>• Parent notification of achievements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Implementation Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Implementation Guide for Educators</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#1F504B' }}>Setting Up Gamification in Your Class</h3>
              <ol className="space-y-3" style={{ color: '#1F504B' }}>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>1</span>
                  <span>Configure point values for different activities in your class settings</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>2</span>
                  <span>Set up custom achievement badges specific to your subject or class goals</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>3</span>
                  <span>Enable leaderboards and choose which metrics to display</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3" style={{ backgroundColor: '#1F504B' }}>4</span>
                  <span>Introduce the system to students and explain how they can earn points</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Practices for Gamification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>For Teachers</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Balance competition with collaboration</li>
                <li>• Recognize effort as much as achievement</li>
                <li>• Use positive reinforcement consistently</li>
                <li>• Celebrate small wins and progress</li>
                <li>• Adjust point values based on difficulty</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>For Students</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Focus on learning, not just points</li>
                <li>• Help classmates to earn collaboration points</li>
                <li>• Set personal goals and track progress</li>
                <li>• Participate actively in class discussions</li>
                <li>• Maintain consistent effort over time</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>System Management</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Regular review of point distributions</li>
                <li>• Monitor student engagement levels</li>
                <li>• Adjust rewards based on effectiveness</li>
                <li>• Gather feedback from students</li>
                <li>• Keep the system fresh with new challenges</li>
              </ul>
            </div>

            <div className="border rounded-lg p-6" style={{ borderColor: '#D8E3E0' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F504B' }}>Avoiding Pitfalls</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Don't over-emphasize competition</li>
                <li>• Ensure all students can succeed</li>
                <li>• Avoid making points the only motivation</li>
                <li>• Balance individual and team rewards</li>
                <li>• Keep the focus on learning outcomes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Analytics & Insights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Insights</h2>
          
          <div className="rounded-lg p-6" style={{ backgroundColor: '#D8E3E0' }}>
            <div className="flex items-center mb-4">
              <BarChart3 className="h-6 w-6 mr-3" style={{ color: '#1F504B' }} />
              <h3 className="text-lg font-semibold" style={{ color: '#1F504B' }}>Gamification Analytics</h3>
            </div>
            <p className="mb-4" style={{ color: '#1F504B' }}>
              Track the effectiveness of your gamification strategy with comprehensive analytics:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" style={{ color: '#1F504B' }}>
              <div>• Student engagement metrics</div>
              <div>• Point distribution analysis</div>
              <div>• Achievement completion rates</div>
              <div>• Leaderboard participation</div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Issues & Solutions</h2>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Points not updating</h4>
              <p className="text-gray-600 text-sm">
                Points are typically updated in real-time, but may take a few minutes during high system usage. 
                Refresh the page or check back shortly.
              </p>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Achievement badge not unlocked</h4>
              <p className="text-gray-600 text-sm">
                Ensure all requirements for the achievement are met. Some badges require multiple criteria 
                or have time-based requirements.
              </p>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: '#D8E3E0' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#1F504B' }}>Leaderboard not showing</h4>
              <p className="text-gray-600 text-sm">
                Leaderboards may be disabled by your teacher or require a minimum number of participants. 
                Contact your teacher if you believe this is an error.
              </p>
            </div>
          </div>
        </section>

        {/* Related Documentation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Documentation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/resources/documentation/student-dashboard"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Student Dashboard</h3>
              <p className="text-gray-600">Learn how students interact with the gamification system through their portal.</p>
            </Link>

            <Link
              href="/solutions/rewards-gamification"
              className="block p-6 border-2 rounded-lg transition-colors"
              style={{ borderColor: '#D8E3E0' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5A8A84'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D8E3E0'}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F504B' }}>Rewards & Gamification</h3>
              <p className="text-gray-600">Explore the complete gamification solution and its benefits.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
