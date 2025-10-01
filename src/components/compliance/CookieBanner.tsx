'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Cookie, Shield, X, ChevronDown, ChevronUp } from 'lucide-react';
import { PolicyType } from '@prisma/client';

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface CookieBannerProps {
  position?: 'bottom' | 'top';
  theme?: 'light' | 'dark';
}

export function CookieBanner({ position = 'bottom', theme = 'light' }: CookieBannerProps) {
  const { data: session } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [consents, setConsents] = useState<CookieConsent>({
    essential: true, // Always required
    analytics: false,
    marketing: false,
    functional: false
  });

  const utils = api.useUtils();

  // Check if user needs to see cookie banner
  const { data: userPolicyStatus } = api.policyVersioning.getUserPolicyStatus.useQuery(
    undefined,
    { 
      enabled: !!session?.user?.id,
      retry: false 
    }
  );

  const { data: cookiePolicy } = api.policyVersioning.getActivePolicyVersion.useQuery(
    { policyType: PolicyType.COOKIE_POLICY },
    { retry: false }
  );

  const acceptPolicyMutation = api.policyVersioning.acceptPolicy.useMutation({
    onSuccess: async () => {
      await utils.policyVersioning.getUserPolicyStatus.invalidate();
      setShowBanner(false);
      setShowPreferences(false);
    }
  });

  const captureConsentMutation = api.consent.capture.useMutation({
    onSuccess: async () => {
      await utils.consent.getStatus.invalidate();
    }
  });

  // Check if cookie banner should be shown
  useEffect(() => {
    if (!session?.user?.id || !userPolicyStatus) return;

    // Check if user needs to accept cookie policy
    const needsCookiePolicy = userPolicyStatus.pendingAcceptances.some(
      acceptance => acceptance.policyType === PolicyType.COOKIE_POLICY
    );

    if (needsCookiePolicy) {
      // Check local storage to see if user dismissed banner temporarily
      const dismissed = localStorage.getItem('cookieBanner_dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      if (!dismissed || dismissedTime < oneWeekAgo) {
        setShowBanner(true);
      }
    }
  }, [session?.user?.id, userPolicyStatus]);

  const handleAcceptAll = async () => {
    if (!session?.user?.id || !cookiePolicy) return;
    
    setLoading(true);
    try {
      // Accept all cookie categories
      const allConsents = {
        essential: true,
        analytics: true,
        marketing: true,
        functional: true
      };

      // Record consent for each category
      await captureConsentMutation.mutateAsync({
        userId: session.user.id,
        dataCategories: ['essential', 'analytics', 'marketing', 'functional'],
        purpose: 'website_functionality_and_analytics',
        legalBasis: 'CONSENT',
        jurisdiction: 'GLOBAL'
      });

      // Accept the cookie policy
      await acceptPolicyMutation.mutateAsync({
        policyVersionId: cookiePolicy.id,
        acceptanceMethod: 'CLICK_THROUGH'
      });

      // Store consent in localStorage for immediate use
      localStorage.setItem('cookieConsents', JSON.stringify(allConsents));
      
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSelected = async () => {
    if (!session?.user?.id || !cookiePolicy) return;
    
    setLoading(true);
    try {
      // Get selected categories
      const selectedCategories = Object.entries(consents)
        .filter(([_, accepted]) => accepted)
        .map(([category]) => category);

      // Record consent for selected categories
      await captureConsentMutation.mutateAsync({
        userId: session.user.id,
        dataCategories: selectedCategories,
        purpose: 'website_functionality_and_analytics',
        legalBasis: 'CONSENT',
        jurisdiction: 'GLOBAL'
      });

      // Accept the cookie policy
      await acceptPolicyMutation.mutateAsync({
        policyVersionId: cookiePolicy.id,
        acceptanceMethod: 'CLICK_THROUGH'
      });

      // Store consent in localStorage
      localStorage.setItem('cookieConsents', JSON.stringify(consents));
      
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    if (!session?.user?.id || !cookiePolicy) return;
    
    setLoading(true);
    try {
      // Only accept essential cookies
      const essentialOnly = {
        essential: true,
        analytics: false,
        marketing: false,
        functional: false
      };

      // Record consent for essential only
      await captureConsentMutation.mutateAsync({
        userId: session.user.id,
        dataCategories: ['essential'],
        purpose: 'website_functionality_only',
        legalBasis: 'LEGITIMATE_INTEREST',
        jurisdiction: 'GLOBAL'
      });

      // Accept the cookie policy
      await acceptPolicyMutation.mutateAsync({
        policyVersionId: cookiePolicy.id,
        acceptanceMethod: 'CLICK_THROUGH'
      });

      // Store consent in localStorage
      localStorage.setItem('cookieConsents', JSON.stringify(essentialOnly));
      
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Temporarily dismiss for one week
    localStorage.setItem('cookieBanner_dismissed', Date.now().toString());
    setShowBanner(false);
  };

  const cookieCategories = [
    {
      id: 'essential',
      name: 'Essential Cookies',
      description: 'Required for the website to function properly. These cannot be disabled.',
      required: true,
      examples: 'Authentication, security, session management'
    },
    {
      id: 'functional',
      name: 'Functional Cookies',
      description: 'Help provide enhanced functionality and personalization.',
      required: false,
      examples: 'Language preferences, region settings, accessibility features'
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website.',
      required: false,
      examples: 'Google Analytics, usage statistics, performance monitoring'
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements and track campaign performance.',
      required: false,
      examples: 'Advertising networks, social media widgets, conversion tracking'
    }
  ];

  if (!showBanner) return null;

  const bannerClasses = `fixed left-0 right-0 z-50 ${
    position === 'top' ? 'top-0' : 'bottom-0'
  } ${
    theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
  } border-t shadow-lg`;

  return (
    <>
      {/* Main Cookie Banner */}
      <div className={bannerClasses}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Cookie Preferences</h3>
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    GDPR Compliant
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                  You can manage your preferences at any time.
                </p>
                {showDetails && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Essential cookies are always active for core functionality</p>
                    <p>• Analytics cookies help us improve our services</p>
                    <p>• Marketing cookies enable personalized content and ads</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8"
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferences(true)}
                disabled={loading}
                className="h-8"
              >
                <Settings className="h-4 w-4 mr-1" />
                Customize
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                disabled={loading}
                className="h-8"
              >
                Reject All
              </Button>
              
              <Button
                size="sm"
                onClick={handleAcceptAll}
                disabled={loading}
                className="h-8"
              >
                {loading ? 'Processing...' : 'Accept All'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Preferences
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage your cookie preferences below. Essential cookies are required for the website to function 
              and cannot be disabled.
            </p>
            
            {cookieCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {category.name}
                        {category.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                    <Checkbox
                      checked={consents[category.id as keyof CookieConsent]}
                      onCheckedChange={(checked) => 
                        setConsents(prev => ({ 
                          ...prev, 
                          [category.id]: Boolean(checked) 
                        }))
                      }
                      disabled={category.required}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    <strong>Examples:</strong> {category.examples}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <strong>Note:</strong> Your preferences will be saved and can be updated at any time through 
              your account settings. Some features may not work properly if certain cookies are disabled.
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreferences(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptSelected}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



