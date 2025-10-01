import Link from 'next/link'
import { ArrowRight, CheckCircle } from 'lucide-react'

interface StoryStep {
  title: string
  description: string
  href: string
  completed?: boolean
  current?: boolean
}

interface StoryNavigationProps {
  currentStep: string
  nextStep?: {
    title: string
    description: string
    href: string
  }
}

const storySteps: StoryStep[] = [
  {
    title: 'The Vision',
    description: 'Discover the future of education',
    href: '/'
  },
  {
    title: 'The Platform',
    description: 'Explore integrated solutions',
    href: '/solutions'
  },
  {
    title: 'The Technology',
    description: 'See technical excellence',
    href: '/features'
  },
  {
    title: 'The Progress',
    description: 'Track development journey',
    href: '/platform-status'
  },
  {
    title: 'The Support',
    description: 'Resources for success',
    href: '/resources'
  },
  {
    title: 'The Team',
    description: 'Meet the people behind FabriiQ',
    href: '/company/about'
  },
  {
    title: 'The Partnership',
    description: 'Join the Alpha program',
    href: '/alpha-program'
  },
  {
    title: 'The Next Step',
    description: 'Begin your journey',
    href: '/demo'
  }
]

export function StoryNavigation({ currentStep, nextStep }: StoryNavigationProps) {
  const currentIndex = storySteps.findIndex(step => step.href === currentStep)
  const updatedSteps = storySteps.map((step, index) => ({
    ...step,
    completed: index < currentIndex,
    current: index === currentIndex
  }))

  const defaultNextStep = currentIndex < storySteps.length - 1 ? storySteps[currentIndex + 1] : storySteps[0]
  const nextStepData = nextStep || defaultNextStep

  return (
    <div className="marketing-section" style={{ backgroundColor: '#F8FAFA' }}>
      <div className="marketing-container">
        {/* Story Progress */}
        <div className="text-center mb-12">
          <h2 className="marketing-heading-lg mb-4">
            Your FabriiQ Journey
          </h2>
          <p className="marketing-body max-w-2xl mx-auto">
            Follow the complete FabriiQ story from vision to partnership
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {updatedSteps.map((step, index) => (
              <Link
                key={index}
                href={step.href}
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  step.current
                    ? 'border-[#1F504B] bg-[#D8E3E0]'
                    : step.completed
                    ? 'border-green-200 bg-green-50 hover:border-green-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                    step.current
                      ? 'bg-[#1F504B] text-white'
                      : step.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold mb-1 ${
                      step.current ? 'text-[#1F504B]' : step.completed ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-xs ${
                      step.current ? 'text-[#1F504B]' : step.completed ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Next Step CTA */}
        <div className="text-center">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium mb-4" style={{ backgroundColor: '#D8E3E0', color: '#1F504B' }}>
            <span>Continue Your Journey</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Next: {nextStepData.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {nextStepData.description}
          </p>
          <Link href={nextStepData.href} className="marketing-btn-primary">
            Continue to {nextStepData.title}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Simplified version for pages that just need next step
export function NextStepCTA({ title, description, href, buttonText }: {
  title: string
  description: string
  href: string
  buttonText: string
}) {
  return (
    <div className="text-center py-16" style={{ backgroundColor: '#F8FAFA' }}>
      <div className="marketing-container">
        <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium mb-4" style={{ backgroundColor: '#D8E3E0', color: '#1F504B' }}>
          <span>Continue Your Journey</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          {description}
        </p>
        <Link href={href} className="marketing-btn-primary">
          {buttonText}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </div>
    </div>
  )
}
