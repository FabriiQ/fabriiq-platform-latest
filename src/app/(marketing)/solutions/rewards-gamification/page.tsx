import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Award, Target, Zap, Users, BarChart3, Trophy, Gift, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Rewards & Gamification System - FabriiQ',
  description: 'Implemented gamification features including student points system, achievements, leaderboards, and social learning elements designed to boost engagement.',
}

const implementedFeatures = [
  {
    icon: Award,
    title: 'Student Points System',
    description: 'Working points tracking for activity completion and academic achievements',
    status: 'operational'
  },
  {
    icon: Trophy,
    title: 'Achievement Framework',
    description: 'Core achievement system with badge infrastructure and milestone tracking',
    status: 'operational'
  },
  {
    icon: Users,
    title: 'Social Learning Features',
    description: 'Social wall system with student interaction and collaboration tools',
    status: 'operational'
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Real-time learning progress analytics and performance visualization',
    status: 'operational'
  },
  {
    icon: Target,
    title: 'Goal Management',
    description: 'Personal learning goal setting with progress indicators',
    status: 'development'
  },
  {
    icon: Gift,
    title: 'Reward System',
    description: 'Point redemption and virtual reward infrastructure',
    status: 'development'
  },
  {
    icon: Zap,
    title: 'Real-time Feedback',
    description: 'Instant recognition system for completed tasks and achievements',
    status: 'development'
  },
  {
    icon: Play,
    title: 'Interactive Elements',
    description: 'Gamified learning activities and engagement challenges',
    status: 'planned'
  }
]

const rewardTypes = [
  {
    category: 'Academic Achievement',
    rewards: [
      'Perfect Score Badge - 100% on assessments',
      'Knowledge Master - Complete all course modules',
      'Quick Learner - Fast completion of activities',
      'Consistent Performer - Maintain high grades'
    ]
  },
  {
    category: 'Participation & Engagement',
    rewards: [
      'Active Participant - Regular class participation',
      'Discussion Leader - Lead class discussions',
      'Helpful Peer - Assist classmates with learning',
      'Question Master - Ask thoughtful questions'
    ]
  },
  {
    category: 'Attendance & Punctuality',
    rewards: [
      'Perfect Attendance - No missed classes',
      'Early Bird - Consistently arrive on time',
      'Reliable Student - Regular attendance pattern',
      'Commitment Champion - Long-term consistency'
    ]
  },
  {
    category: 'Special Achievements',
    rewards: [
      'Innovation Award - Creative problem solving',
      'Leadership Badge - Demonstrate leadership',
      'Improvement Star - Significant progress',
      'Team Player - Excellent collaboration'
    ]
  }
]

const alphaBenefits = [
  'Working student points system with real-time tracking',
  'Operational achievement framework with milestone recognition',
  'Functional social learning features through integrated social wall',
  'Live progress analytics showing student engagement patterns',
  'Core gamification infrastructure ready for advanced features',
  'Alpha testing insights driving continuous improvement',
  'Direct influence on final feature development and design',
  'Early access to next-generation educational engagement tools'
]

export default function RewardsGamificationPage() {
  return (
    <div className="marketing-section">
      <div className="marketing-container">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium mb-8" style={{ backgroundColor: '#D8E3E0', color: '#1F504B' }}>
            <Award className="h-4 w-4 mr-2" />
            <span>Gamified Learning</span>
          </div>
          
          <h1 className="marketing-heading-xl mb-6">
            Student Engagement System
            <span className="text-lg font-normal text-gray-600 block mt-2">Alpha Implementation - Core Features Operational</span>
          </h1>

          <p className="marketing-body-lg max-w-3xl mx-auto mb-10">
            Experience our working student engagement features including points tracking, achievement system,
            and social learning elements. Core gamification infrastructure is operational and being enhanced
            through our Alpha testing program.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/demo" className="marketing-btn-primary">
              See gamification in action
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/solutions/student-portal" className="marketing-btn-secondary">
              View student portal
            </Link>
          </div>

          {/* Alpha Status Metrics */}
          <div className="marketing-grid-3 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#1F504B' }}>4</div>
              <div className="marketing-body-sm">Features Operational</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#5A8A84' }}>3</div>
              <div className="marketing-body-sm">In Development</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#1F504B' }}>Alpha</div>
              <div className="marketing-body-sm">Testing Phase</div>
            </div>
          </div>
        </div>

        {/* Implementation Status Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4">
              Current Implementation Status
            </h2>
            <p className="marketing-body max-w-2xl mx-auto">
              Track the development progress of our student engagement features. Core systems are operational
              with advanced features in active development.
            </p>
          </div>

          <div className="marketing-grid-2 gap-8">
            {implementedFeatures.map((feature, index) => (
              <div key={index} className="marketing-card">
                <div className="flex items-start justify-between mb-4">
                  <feature.icon className="h-8 w-8" style={{ color: '#1F504B' }} />
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    feature.status === 'operational' ? 'bg-green-100 text-green-700' :
                    feature.status === 'development' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {feature.status === 'operational' ? 'Operational' :
                     feature.status === 'development' ? 'In Development' : 'Planned'}
                  </span>
                </div>
                <h3 className="marketing-heading-md mb-3" style={{ color: '#1F504B' }}>{feature.title}</h3>
                <p className="marketing-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reward Categories */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4">
              Achievement categories & rewards
            </h2>
            <p className="marketing-body max-w-2xl mx-auto">
              Students can earn various types of achievements and badges across different categories, 
              recognizing diverse forms of academic and behavioral excellence.
            </p>
          </div>

          <div className="marketing-grid-2 gap-8">
            {rewardTypes.map((category, index) => (
              <div key={index} className="marketing-card">
                <h3 className="marketing-heading-md mb-4" style={{ color: '#1F504B' }}>{category.category}</h3>
                <div className="space-y-3">
                  {category.rewards.map((reward, rewardIndex) => (
                    <div key={rewardIndex} className="flex items-start">
                      <Award className="h-4 w-4 mr-3 mt-1 flex-shrink-0" style={{ color: '#5A8A84' }} />
                      <span className="marketing-body-sm">{reward}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alpha Benefits Section */}
        <div className="rounded-3xl p-8 lg:p-12 mb-20" style={{ backgroundColor: '#D8E3E0' }}>
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4" style={{ color: '#1F504B' }}>
              Alpha Testing Program Benefits
            </h2>
            <p className="marketing-body max-w-2xl mx-auto" style={{ color: '#1F504B' }}>
              Join our Alpha program to experience working engagement features while helping shape
              the future of educational gamification technology.
            </p>
          </div>

          <div className="marketing-grid-2 gap-8">
            {alphaBenefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                <span className="marketing-body" style={{ color: '#1F504B' }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="marketing-heading-lg mb-4">
            Ready to join our Alpha program?
          </h2>
          <p className="marketing-body mb-8 max-w-2xl mx-auto">
            Experience working student engagement features and help shape the future of educational
            gamification through our collaborative Alpha testing program.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo" className="marketing-btn-primary">
              Schedule Alpha demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/platform-status" className="marketing-btn-secondary">
              View implementation status
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
