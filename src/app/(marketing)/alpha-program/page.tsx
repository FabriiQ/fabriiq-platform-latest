import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Users, Lightbulb, Target, Clock, Award, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Alpha Partnership Program - FabriiQ',
  description: 'Join FabriiQ\'s exclusive Alpha Partnership Program. Shape the future of educational technology while experiencing working systems today.',
}

const currentCapabilities = [
  'Complete fee management system with invoice generation',
  'Professional challan templates with discount calculations',
  'Real-time payment processing and validation',
  'Comprehensive audit trail system',
  'Unified administration interface',
  'tRPC-based API architecture',
  'Multi-format document generation',
  'Student enrollment and management system'
]

const alphaBenefits = [
  {
    icon: Users,
    title: 'Full Platform Access',
    description: 'Access to all current operational features and systems as they\'re developed'
  },
  {
    icon: Lightbulb,
    title: 'Development Influence',
    description: 'Direct input on feature development roadmap and system design decisions'
  },
  {
    icon: Target,
    title: 'Priority Support',
    description: '24-48 hour technical response time with dedicated support team'
  },
  {
    icon: Award,
    title: 'Training & Onboarding',
    description: 'Comprehensive training, documentation, and implementation support'
  },
  {
    icon: Clock,
    title: 'Future Advantages',
    description: 'Preferred partner status for Beta release and production licensing'
  },
  {
    icon: Zap,
    title: 'Custom Integration',
    description: 'Workflow consultation and custom integration support'
  }
]

const requirements = [
  'Commitment to provide structured feedback on system functionality',
  'Participate in weekly development calls and feedback sessions',
  'Test new features within 48-72 hours of release',
  'Document use cases, workflows, and institutional requirements',
  'Minimum 6-month partnership commitment',
  'Dedicated technical contact person for communication'
]

const applicationProcess = [
  {
    step: '1',
    title: 'Application Submission',
    description: 'Submit detailed application with institutional information and technical requirements'
  },
  {
    step: '2',
    title: 'Technical Assessment',
    description: 'Technical discussion to assess fit and understand your specific needs'
  },
  {
    step: '3',
    title: 'Partnership Agreement',
    description: 'Finalize partnership terms, expectations, and implementation timeline'
  },
  {
    step: '4',
    title: 'Onboarding & Launch',
    description: 'Comprehensive training, system setup, and partnership launch'
  }
]

export default function AlphaProgramPage() {
  return (
    <div className="marketing-section">
      <div className="marketing-container">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium mb-8" style={{ backgroundColor: '#D8E3E0', color: '#1F504B' }}>
            <Award className="h-4 w-4 mr-2" />
            <span>Exclusive Partnership Invitation</span>
          </div>
          
          <h1 className="marketing-heading-xl mb-6">
            The Partnership Invitation: Join the Innovation Journey
          </h1>
          
          <p className="marketing-body-lg max-w-3xl mx-auto mb-10">
            An exclusive invitation to co-create the future of educational technology. 
            Experience working systems today while helping shape tomorrow's educational platform. 
            This isn't just early access - it's collaborative innovation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#application" className="marketing-btn-primary">
              Apply for partnership
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/platform-status" className="marketing-btn-secondary">
              View current progress
            </Link>
          </div>
        </div>

        {/* Current Capabilities */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4">
              What's Working Today
            </h2>
            <p className="marketing-body max-w-2xl mx-auto">
              These aren't promises - they're operational systems you can use immediately 
              as an Alpha partner while we build the complete platform together.
            </p>
          </div>

          <div className="marketing-grid-2 gap-6">
            {currentCapabilities.map((capability, index) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                <span className="marketing-body">{capability}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alpha Benefits */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4">
              Alpha Partnership Benefits
            </h2>
            <p className="marketing-body max-w-2xl mx-auto">
              More than early access - this is collaborative innovation where your input 
              directly shapes the future of educational technology.
            </p>
          </div>

          <div className="marketing-grid-3 gap-8">
            {alphaBenefits.map((benefit, index) => (
              <div key={index} className="marketing-card text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#D8E3E0' }}>
                  <benefit.icon className="h-6 w-6" style={{ color: '#1F504B' }} />
                </div>
                <h3 className="marketing-heading-md mb-3" style={{ color: '#1F504B' }}>{benefit.title}</h3>
                <p className="marketing-body">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-3xl p-8 lg:p-12 mb-20" style={{ backgroundColor: '#D8E3E0' }}>
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4" style={{ color: '#1F504B' }}>
              Partnership Requirements
            </h2>
            <p className="marketing-body max-w-2xl mx-auto" style={{ color: '#1F504B' }}>
              We're looking for committed partners who want to actively participate in 
              shaping the future of educational technology.
            </p>
          </div>

          <div className="space-y-4">
            {requirements.map((requirement, index) => (
              <div key={index} className="flex items-start bg-white/50 rounded-lg p-4">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1F504B' }} />
                <span className="marketing-body" style={{ color: '#1F504B' }}>{requirement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Application Process */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="marketing-heading-lg mb-4">
              Application Process
            </h2>
            <p className="marketing-body max-w-2xl mx-auto">
              A structured process to ensure the right fit for both your institution and our development goals.
            </p>
          </div>

          <div className="marketing-grid-2 gap-8">
            {applicationProcess.map((process, index) => (
              <div key={index} className="marketing-card">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0" style={{ backgroundColor: '#1F504B' }}>
                    <span className="text-white font-bold text-sm">{process.step}</span>
                  </div>
                  <div>
                    <h3 className="marketing-heading-md mb-2" style={{ color: '#1F504B' }}>{process.title}</h3>
                    <p className="marketing-body">{process.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center" id="application">
          <h2 className="marketing-heading-lg mb-4">
            Ready to Shape the Future?
          </h2>
          <p className="marketing-body mb-8 max-w-2xl mx-auto">
            Join our exclusive Alpha Partnership Program and be part of the educational technology revolution. 
            Your institution's input will directly influence the platform that transforms education.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo" className="marketing-btn-primary">
              Schedule partnership discussion
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/platform-status" className="marketing-btn-ghost">
              Review implementation status
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
