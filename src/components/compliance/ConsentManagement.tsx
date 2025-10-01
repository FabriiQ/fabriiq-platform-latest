'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Shield, 
  Settings, 
  History, 
  AlertTriangle, 
  Check, 
  X, 
  Download,
  FileText,
  Clock,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PolicyType, LegalBasis } from '@prisma/client';

interface ConsentCategory {
  id: string;
  name: string;
  description: string;
  legalBasis: LegalBasis;
  currentStatus: boolean;
  canWithdraw: boolean;
  lastUpdated?: Date;
}

export function ConsentManagement() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [withdrawalCategory, setWithdrawalCategory] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get user's current consent status
  const { data: consentStatus, isLoading: consentLoading } = api.consent.getStatus.useQuery(
    { dataCategories: ['essential', 'analytics', 'marketing', 'functional', 'cookies'] },
    { enabled: !!session?.user?.id }
  );

  // Get user's policy status
  const { data: policyStatus, isLoading: policyLoading } = api.policyVersioning.getUserPolicyStatus.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  const withdrawConsentMutation = api.consent.withdraw.useMutation({
    onSuccess: async () => {
      await utils.consent.getStatus.invalidate();
      setShowConfirmDialog(false);
      setWithdrawalCategory(null);
    }
  });

  const captureConsentMutation = api.consent.capture.useMutation({
    onSuccess: async () => {
      await utils.consent.getStatus.invalidate();
      setPendingChanges({});
    }
  });

  const handleConsentChange = (category: string, granted: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [category]: granted
    }));
  };

  const handleSaveChanges = async () => {
    if (!session?.user?.id || Object.keys(pendingChanges).length === 0) return;

    setLoading(true);
    try {
      // Process each changed category
      for (const [category, granted] of Object.entries(pendingChanges)) {
        if (granted) {
          // Grant consent
          await captureConsentMutation.mutateAsync({
            userId: session.user.id,
            dataCategories: [category],
            purpose: `${category}_processing`,
            legalBasis: category === 'essential' ? 'LEGITIMATE_INTEREST' : 'CONSENT',
            jurisdiction: 'GLOBAL'
          });
        } else if (category !== 'essential') {
          // Withdraw consent (except for essential)
          await withdrawConsentMutation.mutateAsync({
            userId: session.user.id,
            dataCategories: [category],
            reason: 'User requested withdrawal'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = (category: string) => {
    setWithdrawalCategory(category);
    setShowConfirmDialog(true);
  };

  const confirmWithdrawal = async () => {
    if (!session?.user?.id || !withdrawalCategory) return;

    setLoading(true);
    try {
      await withdrawConsentMutation.mutateAsync({
        userId: session.user.id,
        dataCategories: [withdrawalCategory],
        reason: 'User requested withdrawal via consent management'
      });
    } finally {
      setLoading(false);
    }
  };

  const consentCategories: ConsentCategory[] = [
    {
      id: 'essential',
      name: 'Essential Cookies & Data',
      description: 'Required for the platform to function properly. Cannot be withdrawn.',
      legalBasis: 'LEGITIMATE_INTEREST',
      currentStatus: true, // Always true
      canWithdraw: false,
      lastUpdated: new Date()
    },
    {
      id: 'functional',
      name: 'Functional Data Processing',
      description: 'Enables enhanced features like personalized dashboards and preferences.',
      legalBasis: 'CONSENT',
      currentStatus: consentStatus?.status?.find(s => s.dataCategory === 'functional')?.consentGiven || false,
      canWithdraw: true,
      lastUpdated: new Date()
    },
    {
      id: 'analytics',
      name: 'Analytics & Performance',
      description: 'Helps us understand how you use the platform to improve our services.',
      legalBasis: 'CONSENT',
      currentStatus: consentStatus?.status?.find(s => s.dataCategory === 'analytics')?.consentGiven || false,
      canWithdraw: true,
      lastUpdated: new Date()
    },
    {
      id: 'marketing',
      name: 'Marketing Communications',
      description: 'Enables personalized content and relevant promotional messages.',
      legalBasis: 'CONSENT',
      currentStatus: consentStatus?.status?.find(s => s.dataCategory === 'marketing')?.consentGiven || false,
      canWithdraw: true,
      lastUpdated: new Date()
    }
  ];

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (consentLoading || policyLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your privacy preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Privacy & Consent Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your data processing preferences and review your consent history.
          </p>
        </div>
        
        <Badge variant="secondary" className="flex items-center gap-1">
          <Check className="h-3 w-3" />
          GDPR Compliant
        </Badge>
      </div>

      <Tabs defaultValue="consents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consents" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Current Consents
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Consent History
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Policy Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consents" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You have full control over your data. You can update your preferences at any time, 
              except for essential data processing required for the platform to function.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {consentCategories.map((category) => {
              const currentStatus = pendingChanges[category.id] ?? category.currentStatus;
              
              return (
                <Card key={category.id} className={currentStatus ? 'border-green-200 bg-green-50/50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {category.name}
                          {category.legalBasis === 'LEGITIMATE_INTEREST' && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {currentStatus && (
                            <Badge className="text-xs bg-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {category.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Legal Basis: {category.legalBasis.replace('_', ' ')}</span>
                          {category.lastUpdated && (
                            <span>
                              Updated {formatDistanceToNow(category.lastUpdated, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={currentStatus}
                          onCheckedChange={(checked) => 
                            handleConsentChange(category.id, Boolean(checked))
                          }
                          disabled={!category.canWithdraw}
                        />
                        {category.canWithdraw && currentStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWithdrawConsent(category.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {hasChanges && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPendingChanges({})}
                disabled={loading}
              >
                Cancel Changes
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Consent Changes
              </CardTitle>
              <CardDescription>
                A log of your recent consent updates and policy acceptances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock history data - in real implementation, this would come from API */}
                <div className="flex items-center justify-between py-2 border-b border-muted">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Analytics consent granted</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Granted</Badge>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-muted">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Privacy Policy v2.1 accepted</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Accepted</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4">
            {policyStatus?.pendingAcceptances && policyStatus.pendingAcceptances.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have {policyStatus.pendingAcceptances.length} pending policy acceptance(s). 
                  Please review and accept the updated policies.
                </AlertDescription>
              </Alert>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Policy Acceptance Status
                </CardTitle>
                <CardDescription>
                  Current status of your policy acceptances and any pending updates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policyStatus?.recentAcceptances?.map((acceptance, index) => (
                    <div key={`${acceptance.policyVersionId}-${index}`} className="flex items-center justify-between py-2 border-b border-muted">
                      <div className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">
                            {acceptance.policyType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} v{acceptance.version}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Accepted {formatDistanceToNow(acceptance.acceptedAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Accepted
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {policyStatus?.pendingAcceptances?.map((pending, index) => (
                    <div key={`pending-${pending.policyVersionId}-${index}`} className="flex items-center justify-between py-2 border-b border-muted">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <div>
                          <p className="font-medium">
                            {pending.policyType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} v{pending.version}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pending.isOverdue ? 'Overdue' : 'Pending acceptance'}
                            {pending.acceptanceDeadline && (
                              ` • Due ${formatDistanceToNow(pending.acceptanceDeadline, { addSuffix: true })}`
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pending.isOverdue ? 'destructive' : 'secondary'}>
                          {pending.isOverdue ? 'Overdue' : 'Pending'}
                        </Badge>
                        <Button size="sm">
                          Review & Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Consent Withdrawal
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>
              Are you sure you want to withdraw your consent for{' '}
              <strong>
                {withdrawalCategory && 
                  consentCategories.find(c => c.id === withdrawalCategory)?.name
                }
              </strong>?
            </p>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Withdrawing this consent may affect your experience on the platform. 
                Some features may no longer be available or work as expected.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmWithdrawal}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Withdraw Consent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}