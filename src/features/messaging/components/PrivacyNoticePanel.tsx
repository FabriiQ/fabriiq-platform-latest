/**
 * Privacy Notice Panel
 * Intelligent privacy notices based on compliance profile (rule-based)
 */

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Archive,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Globe,
  Info
} from 'lucide-react';

export interface ComplianceProfile {
  contentCategory: 'GENERAL' | 'EDUCATIONAL' | 'PERSONAL' | 'SENSITIVE';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isEducationalRecord: boolean;
  encryptionLevel: 'STANDARD' | 'ENHANCED' | 'MAXIMUM';
  auditRequired: boolean;
  legalBasis: 'CONSENT' | 'LEGITIMATE_INTEREST' | 'CONTRACT' | 'LEGAL_OBLIGATION';
  dataCategories: string[];
  retentionPeriod?: string;
  crossBorderTransfer: boolean;
  consentRequired: boolean;
  parentalConsentRequired: boolean;
}

interface PrivacyNoticePanelProps {
  complianceProfile: ComplianceProfile;
  recipientTypes: string[];
  messageType: 'DIRECT' | 'GROUP' | 'BROADCAST' | 'ANNOUNCEMENT';
  className?: string;
}

export function PrivacyNoticePanel({ 
  complianceProfile, 
  recipientTypes, 
  messageType,
  className = '' 
}: PrivacyNoticePanelProps) {
  
  // Generate privacy notices based on compliance profile
  const privacyNotices = useMemo(() => {
    const notices: Array<{
      type: 'info' | 'warning' | 'error';
      title: string;
      description: string;
      icon: React.ReactNode;
      badge?: string;
    }> = [];

    // FERPA Notice
    if (complianceProfile.isEducationalRecord) {
      notices.push({
        type: 'warning',
        title: 'FERPA Protected Content',
        description: 'This message contains educational records protected under FERPA. Access is restricted to authorized personnel only.',
        icon: <Archive className="h-4 w-4" />,
        badge: 'FERPA'
      });
    }

    // GDPR Notice
    if (complianceProfile.dataCategories.includes('personal') || complianceProfile.riskLevel === 'HIGH') {
      notices.push({
        type: 'info',
        title: 'GDPR Data Processing',
        description: `Personal data is processed under ${complianceProfile.legalBasis.toLowerCase().replace('_', ' ')} basis. You have rights regarding your personal data.`,
        icon: <CheckCircle className="h-4 w-4" />,
        badge: 'GDPR'
      });
    }

    // PDPL Notice (for regions that require it)
    if (complianceProfile.dataCategories.includes('sensitive') || complianceProfile.riskLevel === 'CRITICAL') {
      notices.push({
        type: 'warning',
        title: 'Sensitive Data Protection',
        description: 'This message may contain sensitive personal data. Enhanced protection measures are in effect.',
        icon: <Archive className="h-4 w-4" />,
        badge: 'PDPL'
      });
    }

    // Encryption Notice
    if (complianceProfile.encryptionLevel !== 'STANDARD') {
      notices.push({
        type: 'info',
        title: 'Enhanced Encryption',
        description: `Message content is protected with ${complianceProfile.encryptionLevel.toLowerCase()} encryption for security.`,
        icon: <Archive className="h-4 w-4" />,
        badge: 'ENCRYPTED'
      });
    }

    // Audit Notice
    if (complianceProfile.auditRequired) {
      notices.push({
        type: 'info',
        title: 'Audit Trail',
        description: 'This message is subject to audit logging for compliance and security purposes.',
        icon: <Eye className="h-4 w-4" />,
        badge: 'AUDITED'
      });
    }

    // Retention Notice
    if (complianceProfile.retentionPeriod) {
      notices.push({
        type: 'info',
        title: 'Data Retention',
        description: `This message will be retained for ${complianceProfile.retentionPeriod} as per institutional policy.`,
        icon: <Clock className="h-4 w-4" />,
        badge: 'RETENTION'
      });
    }

    // Cross-border Transfer Notice
    if (complianceProfile.crossBorderTransfer) {
      notices.push({
        type: 'warning',
        title: 'International Transfer',
        description: 'This message may be transferred internationally. Appropriate safeguards are in place.',
        icon: <Globe className="h-4 w-4" />,
        badge: 'TRANSFER'
      });
    }

    // Consent Notice
    if (complianceProfile.consentRequired || complianceProfile.parentalConsentRequired) {
      const consentType = complianceProfile.parentalConsentRequired ? 'parental consent' : 'consent';
      notices.push({
        type: 'warning',
        title: 'Consent Required',
        description: `This message requires ${consentType} before processing. Please ensure proper authorization.`,
        icon: <CheckCircle className="h-4 w-4" />,
        badge: 'CONSENT'
      });
    }

    // Risk Level Notice
    if (complianceProfile.riskLevel === 'HIGH' || complianceProfile.riskLevel === 'CRITICAL') {
      notices.push({
        type: complianceProfile.riskLevel === 'CRITICAL' ? 'error' : 'warning',
        title: `${complianceProfile.riskLevel} Risk Content`,
        description: 'This message has been flagged for enhanced review due to its content sensitivity.',
        icon: <AlertTriangle className="h-4 w-4" />,
        badge: complianceProfile.riskLevel
      });
    }

    return notices;
  }, [complianceProfile]);

  // Generate recipient-specific notices
  const recipientNotices = useMemo(() => {
    const notices: string[] = [];

    if (recipientTypes.includes('PARENT')) {
      notices.push('Parents will receive notifications about educational content involving their children.');
    }

    if (recipientTypes.includes('STUDENT') && complianceProfile.parentalConsentRequired) {
      notices.push('Student communications may require parental consent for minors.');
    }

    if (messageType === 'BROADCAST' && complianceProfile.riskLevel !== 'LOW') {
      notices.push('Broadcast messages with sensitive content are subject to additional review.');
    }

    if (recipientTypes.some(type => type.includes('ADMIN'))) {
      notices.push('Administrative recipients have enhanced access rights and responsibilities.');
    }

    return notices;
  }, [recipientTypes, messageType, complianceProfile]);

  const getAlertVariant = (type: 'info' | 'warning' | 'error') => {
    // Since Alert component doesn't have variants in our setup, we'll use CSS classes
    return type;
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'FERPA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'GDPR': return 'bg-green-100 text-green-800 border-green-200';
      case 'PDPL': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ENCRYPTED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'AUDITED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RETENTION': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'TRANSFER': return 'bg-red-100 text-red-800 border-red-200';
      case 'CONSENT': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (privacyNotices.length === 0 && recipientNotices.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Standard privacy protection applies</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" />
          Privacy & Compliance Notice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compliance Badges */}
        {privacyNotices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {privacyNotices.map((notice, index) => (
              notice.badge && (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={getBadgeColor(notice.badge)}
                >
                  {notice.badge}
                </Badge>
              )
            ))}
          </div>
        )}

        {/* Privacy Notices */}
        <div className="space-y-2">
          {privacyNotices.map((notice, index) => (
            <Alert key={index} className={`${
              notice.type === 'error' ? 'border-red-200 bg-red-50' :
              notice.type === 'warning' ? 'border-orange-200 bg-orange-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-start gap-2">
                {notice.icon}
                <div className="flex-1">
                  <div className="font-medium text-sm">{notice.title}</div>
                  <AlertDescription className="text-xs mt-1">
                    {notice.description}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>

        {/* Recipient-specific notices */}
        {recipientNotices.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Recipient Information:</div>
            {recipientNotices.map((notice, index) => (
              <div key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>{notice}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            <strong>Summary:</strong> This message is classified as{' '}
            <span className="font-medium">{complianceProfile.contentCategory.toLowerCase()}</span>{' '}
            content with{' '}
            <span className="font-medium">{complianceProfile.riskLevel.toLowerCase()}</span>{' '}
            risk level and requires{' '}
            <span className="font-medium">{complianceProfile.encryptionLevel.toLowerCase()}</span>{' '}
            security measures.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
