import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, AlertCircle, Users, BookOpen, Award, BarChart3, Settings, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Platform Status - FabriiQ Implementation Progress',
  description: 'Current implementation status of FabriiQ platform features, including completed systems, work in progress, and upcoming developments.',
}

const implementedFeatures = [
  {
    category: 'Core Platform',
    icon: Settings,
    features: [
      { name: 'Multi-Campus Architecture', status: 'complete', description: 'Centralized management with campus-specific customization' },
      { name: 'User Management System', status: 'complete', description: 'Role-based access control for all user types' },
      { name: 'Authentication & Security', status: 'complete', description: 'Secure login with session management' },
      { name: 'Real-time Data Sync', status: 'complete', description: 'Live updates across all platform components' }
    ]
  },
  {
    category: 'Student Information System',
    icon: Users,
    features: [
      { name: 'Student Enrollment', status: 'complete', description: 'Comprehensive enrollment workflow and management' },
      { name: 'Fee Management', status: 'in-progress', description: 'Fee structures, payment processing, and late fee policies' },
      { name: 'Academic Records', status: 'complete', description: 'Student academic history and transcript management' },
      { name: 'Campus Management', status: 'complete', description: 'Multi-campus operations and coordination' }
    ]
  },
  {
    category: 'Learning Experience Platform',
    icon: BookOpen,
    features: [
      { name: 'Curriculum Management', status: 'complete', description: 'Comprehensive curriculum with Bloom\'s taxonomy integration' },
      { name: 'Assessment System', status: 'complete', description: 'Assessment creation, grading, and analytics' },
      { name: 'Activity System', status: 'complete', description: '14+ activity types with AI generation capabilities' },
      { name: 'Question Bank', status: 'complete', description: 'Enterprise-grade question repository with Bloom\'s classification' }
    ]
  },
  {
    category: 'Teacher Portal',
    icon: Award,
    features: [
      { name: 'Classroom Management', status: 'complete', description: 'Class oversight, attendance, and student management' },
      { name: 'AI Teaching Assistant', status: 'complete', description: 'AIVY multi-agent system for teaching support' },
      { name: 'Grading & Feedback', status: 'complete', description: 'Automated grading with rubric-based evaluation' },
      { name: 'Content Creation', status: 'complete', description: 'AI-powered content and assessment creation tools' }
    ]
  },
  {
    category: 'Student Portal',
    icon: Users,
    features: [
      { name: 'Learning Dashboard', status: 'complete', description: 'Class-centric learning journey and progress tracking' },
      { name: 'Social Wall', status: 'complete', description: 'Social learning features with moderation' },
      { name: 'Rewards System', status: 'complete', description: 'Gamification with points, achievements, and leaderboards' },
      { name: 'Mobile Experience', status: 'complete', description: 'Mobile-first design with offline capabilities' }
    ]
  },
  {
    category: 'Analytics & Reporting',
    icon: BarChart3,
    features: [
      { name: 'Bloom\'s Analytics', status: 'complete', description: 'Real-time cognitive distribution analysis' },
      { name: 'Performance Dashboards', status: 'complete', description: 'Multi-campus performance monitoring' },
      { name: 'Learning Patterns', status: 'complete', description: 'Student learning behavior analysis' },
      { name: 'Financial Reporting', status: 'in-progress', description: 'Fee collection and financial intelligence' }
    ]
  }
]

const upcomingFeatures = [
  { name: 'Result Cards Generation', timeline: 'Next 3 months', priority: 'high' },
  { name: 'Notifications Management', timeline: 'Next 3 months', priority: 'high' },
  { name: 'Principal Portal', timeline: 'Next 3 months', priority: 'medium' },
  { name: 'C-Level Analytics Portal', timeline: 'Next 3 months', priority: 'medium' },
  { name: 'Student Transfer System', timeline: 'Next 3 months', priority: 'low' },
  { name: 'AI Content Studio', timeline: 'Next 3 months', priority: 'medium' }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'complete':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'in-progress':
      return <Clock className="h-5 w-5 text-yellow-600" />
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'complete':
      return 'Implemented'
    case 'in-progress':
      return 'In Progress'
    default:
      return 'Planned'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'in-progress':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export default function PlatformStatusPage() {
  const completedCount = implementedFeatures.reduce((acc, category) => 
    acc + category.features.filter(f => f.status === 'complete').length, 0
  )
  const totalCount = implementedFeatures.reduce((acc, category) => acc + category.features.length, 0)
  const completionPercentage = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="marketing-section">
      <div className="marketing-container">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium mb-8" style={{ backgroundColor: '#D8E3E0', color: '#1F504B' }}>
            <Zap className="h-4 w-4 mr-2" />
            <span>Live Platform Status</span>
          </div>
          
          <h1 className="marketing-heading-xl mb-6">
            FabriiQ Implementation Progress
          </h1>
          
          <p className="marketing-body-lg max-w-3xl mx-auto mb-10">
            Track the current status of FabriiQ platform development. See what's already implemented, 
            what's currently in progress, and what's coming next in our development roadmap.
          </p>

          {/* Overall Progress */}
          <div className="max-w-md mx-auto mb-12">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-medium" style={{ color: '#1F504B' }}>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-500" 
                style={{ backgroundColor: '#1F504B', width: `${completionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{completedCount} completed</span>
              <span>{totalCount - completedCount} remaining</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo" className="marketing-btn-primary">
              See implemented features
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/solutions" className="marketing-btn-secondary">
              Explore solutions
            </Link>
          </div>
        </div>

        {/* Implementation Status */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4">
              Feature Implementation Status
            </h2>
            <p className="marketing-body max-w-2xl mx-auto">
              Detailed breakdown of all platform components and their current implementation status.
            </p>
          </div>

          <div className="space-y-8">
            {implementedFeatures.map((category, index) => (
              <div key={index} className="marketing-card">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: '#D8E3E0' }}>
                    <category.icon className="h-6 w-6" style={{ color: '#1F504B' }} />
                  </div>
                  <div>
                    <h3 className="marketing-heading-md" style={{ color: '#1F504B' }}>{category.category}</h3>
                    <p className="text-sm text-gray-600">
                      {category.features.filter(f => f.status === 'complete').length} of {category.features.length} features implemented
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {category.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getStatusIcon(feature.status)}
                          <h4 className="font-semibold text-gray-900 ml-3">{feature.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 ml-8">{feature.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(feature.status)}`}>
                        {getStatusText(feature.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Features */}
        <div className="rounded-3xl p-8 lg:p-12 mb-20" style={{ backgroundColor: '#D8E3E0' }}>
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4" style={{ color: '#1F504B' }}>
              Upcoming Features
            </h2>
            <p className="marketing-body max-w-2xl mx-auto" style={{ color: '#1F504B' }}>
              Features currently in development or planned for the next development cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    feature.priority === 'high' ? 'bg-red-100 text-red-700' :
                    feature.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {feature.priority} priority
                  </span>
                </div>
                <p className="text-sm text-gray-600">{feature.timeline}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="marketing-heading-lg mb-4">
            Ready to experience what's already built?
          </h2>
          <p className="marketing-body mb-8 max-w-2xl mx-auto">
            With {completionPercentage}% of core features already implemented, FabriiQ is ready for pilot projects 
            and early adoption by forward-thinking educational institutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo" className="marketing-btn-primary">
              Schedule pilot project
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/pricing" className="marketing-btn-ghost">
              View pricing options
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
