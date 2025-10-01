/**
 * Breach Notification Templates
 * Email and communication templates for various types of security incidents and breaches
 */

export interface BreachNotificationData {
  incidentId: string;
  incidentType: 'DATA_BREACH' | 'FERPA_VIOLATION' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  affectedUsers?: number;
  affectedDataCategories: string[];
  detectedAt: Date;
  reportedBy?: string;
  actionsTaken: string[];
  nextSteps: string[];
  contactEmail: string;
  contactPhone?: string;
}

export interface NotificationRecipient {
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'LEGAL' | 'EXECUTIVE' | 'REGULATOR';
  userType?: string;
}

export class BreachNotificationTemplates {
  
  /**
   * Generate user notification email for data breach
   */
  static generateUserNotificationEmail(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = this.getUserNotificationSubject(data);
    const html = this.getUserNotificationHTML(data, recipient);
    const text = this.getUserNotificationText(data, recipient);

    return { subject, html, text };
  }

  /**
   * Generate internal administrative notification
   */
  static generateAdminNotificationEmail(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `[URGENT] Security Incident: ${data.title} (${data.incidentId})`;
    const html = this.getAdminNotificationHTML(data, recipient);
    const text = this.getAdminNotificationText(data, recipient);

    return { subject, html, text };
  }

  /**
   * Generate regulatory notification (for authorities)
   */
  static generateRegulatoryNotificationEmail(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Data Breach Notification - ${data.title} (${data.incidentId})`;
    const html = this.getRegulatoryNotificationHTML(data, recipient);
    const text = this.getRegulatoryNotificationText(data, recipient);

    return { subject, html, text };
  }

  /**
   * Generate 72-hour breach notification for FERPA compliance
   */
  static generateFERPABreachNotification(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `FERPA Breach Notification - Educational Records Security Incident (${data.incidentId})`;
    const html = this.getFERPABreachNotificationHTML(data, recipient);
    const text = this.getFERPABreachNotificationText(data, recipient);

    return { subject, html, text };
  }

  // Private template methods

  private static getUserNotificationSubject(data: BreachNotificationData): string {
    const urgencyMap = {
      CRITICAL: '[URGENT] ',
      HIGH: '[IMPORTANT] ',
      MEDIUM: '',
      LOW: ''
    };

    return `${urgencyMap[data.severity]}Security Notice: Your Account Information`;
  }

  private static getUserNotificationHTML(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    const severityColor = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#0891b2'
    };

    const typeDescription = {
      DATA_BREACH: 'data security incident',
      FERPA_VIOLATION: 'educational records access issue',
      UNAUTHORIZED_ACCESS: 'unauthorized access attempt',
      SUSPICIOUS_ACTIVITY: 'suspicious account activity'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Notice</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: ${severityColor[data.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }
        .severity-badge { display: inline-block; background: ${severityColor[data.severity]}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .incident-id { font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px; border-left: 4px solid ${severityColor[data.severity]}; }
        .data-categories { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; }
        .actions-taken { background: #ecfdf5; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; }
        .next-steps { background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .contact-info { background: #f9fafb; padding: 20px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 30px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Security Notice</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Important information about your account security</p>
        </div>

        <p>Dear ${recipient.name},</p>

        <p>We are writing to inform you about ${data.severity === 'CRITICAL' ? 'a critical' : 'an'} ${typeDescription[data.incidentType]} that may have affected your personal information in our system.</p>

        <div class="incident-id">
            <strong>Incident Reference:</strong> ${data.incidentId}<br>
            <strong>Severity:</strong> <span class="severity-badge">${data.severity}</span><br>
            <strong>Detected:</strong> ${data.detectedAt.toLocaleString()}
        </div>

        <h3>What Happened</h3>
        <p>${data.description}</p>

        <div class="data-categories">
            <h4 style="margin-top: 0;">Information That May Have Been Affected</h4>
            <ul>
                ${data.affectedDataCategories.map(category => `<li>${this.formatDataCategory(category)}</li>`).join('')}
            </ul>
        </div>

        <div class="actions-taken">
            <h4 style="margin-top: 0;">What We Did</h4>
            <ul>
                ${data.actionsTaken.map(action => `<li>${action}</li>`).join('')}
            </ul>
        </div>

        <div class="next-steps">
            <h4 style="margin-top: 0;">What You Should Do</h4>
            <ul>
                ${data.nextSteps.map(step => `<li>${step}</li>`).join('')}
            </ul>
            <p><strong>We recommend taking these steps as soon as possible to protect your account.</strong></p>
        </div>

        <h3>Additional Security Measures</h3>
        <p>As an additional precaution, we recommend:</p>
        <ul>
            <li>Review your account settings and recent activity</li>
            <li>Change your password if you haven't done so recently</li>
            <li>Enable two-factor authentication if not already enabled</li>
            <li>Monitor your accounts for any unusual activity</li>
        </ul>

        <div class="contact-info">
            <h4 style="margin-top: 0;">Questions or Concerns?</h4>
            <p>If you have any questions about this incident or need assistance securing your account, please contact us:</p>
            <p>
                <strong>Email:</strong> ${data.contactEmail}<br>
                ${data.contactPhone ? `<strong>Phone:</strong> ${data.contactPhone}<br>` : ''}
                <strong>Reference ID:</strong> ${data.incidentId}
            </p>
        </div>

        <p>We take the security of your information very seriously and sincerely apologize for any inconvenience this incident may cause. We are committed to preventing similar incidents in the future.</p>

        <div class="footer">
            <p>This is an automated security notification. Please do not reply to this email.</p>
            <p>If you believe you received this email in error, please contact us at ${data.contactEmail}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private static getUserNotificationText(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    const typeDescription = {
      DATA_BREACH: 'data security incident',
      FERPA_VIOLATION: 'educational records access issue',
      UNAUTHORIZED_ACCESS: 'unauthorized access attempt',
      SUSPICIOUS_ACTIVITY: 'suspicious account activity'
    };

    return `
SECURITY NOTICE - IMPORTANT INFORMATION ABOUT YOUR ACCOUNT

Dear ${recipient.name},

We are writing to inform you about a ${typeDescription[data.incidentType]} that may have affected your personal information in our system.

INCIDENT DETAILS:
- Reference ID: ${data.incidentId}
- Severity: ${data.severity}
- Detected: ${data.detectedAt.toLocaleString()}

WHAT HAPPENED:
${data.description}

INFORMATION THAT MAY HAVE BEEN AFFECTED:
${data.affectedDataCategories.map(category => `• ${this.formatDataCategory(category)}`).join('\n')}

WHAT WE DID:
${data.actionsTaken.map(action => `• ${action}`).join('\n')}

WHAT YOU SHOULD DO:
${data.nextSteps.map(step => `• ${step}`).join('\n')}

ADDITIONAL SECURITY MEASURES:
• Review your account settings and recent activity
• Change your password if you haven't done so recently
• Enable two-factor authentication if not already enabled
• Monitor your accounts for any unusual activity

CONTACT INFORMATION:
If you have any questions about this incident or need assistance securing your account:
Email: ${data.contactEmail}
${data.contactPhone ? `Phone: ${data.contactPhone}` : ''}
Reference ID: ${data.incidentId}

We take the security of your information very seriously and sincerely apologize for any inconvenience this incident may cause.

This is an automated security notification. Please do not reply to this email.
    `;
  }

  private static getAdminNotificationHTML(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Security Incident Alert</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .alert-header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px; margin: -40px -40px 30px -40px; }
        .incident-details { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .severity-critical { border-left: 5px solid #dc2626; }
        .severity-high { border-left: 5px solid #ea580c; }
        .severity-medium { border-left: 5px solid #ca8a04; }
        .severity-low { border-left: 5px solid #0891b2; }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .data-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
        .urgent { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        .action-required { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="alert-header ${data.severity === 'CRITICAL' ? 'urgent' : ''}">
            <h1 style="margin: 0; font-size: 28px;">🚨 SECURITY INCIDENT ALERT</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Immediate administrative attention required</p>
        </div>

        <div class="incident-details severity-${data.severity.toLowerCase()}">
            <h2 style="margin-top: 0; color: #dc2626;">Incident Summary</h2>
            <div class="data-grid">
                <div class="data-card">
                    <strong>Incident ID:</strong><br>
                    <code>${data.incidentId}</code>
                </div>
                <div class="data-card">
                    <strong>Type:</strong><br>
                    ${data.incidentType.replace('_', ' ')}
                </div>
                <div class="data-card">
                    <strong>Severity:</strong><br>
                    <span style="color: #dc2626; font-weight: bold;">${data.severity}</span>
                </div>
                <div class="data-card">
                    <strong>Detected:</strong><br>
                    ${data.detectedAt.toLocaleString()}
                </div>
            </div>
            
            <h3>Description</h3>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">${data.description}</p>
            
            ${data.affectedUsers ? `<p><strong>Affected Users:</strong> ${data.affectedUsers}</p>` : ''}
            
            <h3>Affected Data Categories</h3>
            <ul>
                ${data.affectedDataCategories.map(category => `<li>${this.formatDataCategory(category)}</li>`).join('')}
            </ul>
        </div>

        ${data.severity === 'CRITICAL' ? `
        <div class="action-required">
            <h3 style="margin-top: 0;">⚠️ IMMEDIATE ACTION REQUIRED</h3>
            <p><strong>This is a CRITICAL security incident requiring immediate response within 1 hour.</strong></p>
            <ul>
                <li>Escalate to incident response team</li>
                <li>Begin containment procedures</li>
                <li>Prepare for potential regulatory notification</li>
                <li>Document all response actions</li>
            </ul>
        </div>
        ` : ''}

        <h3>Actions Taken</h3>
        <ul>
            ${data.actionsTaken.map(action => `<li>✅ ${action}</li>`).join('')}
        </ul>

        <h3>Next Steps</h3>
        <ul>
            ${data.nextSteps.map(step => `<li>📋 ${step}</li>`).join('')}
        </ul>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p>
                <strong>Security Team:</strong> ${data.contactEmail}<br>
                ${data.contactPhone ? `<strong>Emergency Line:</strong> ${data.contactPhone}<br>` : ''}
                ${data.reportedBy ? `<strong>Reported By:</strong> ${data.reportedBy}<br>` : ''}
            </p>
        </div>

        <div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px; font-size: 14px; color: #6b7280;">
            <p><strong>This is an automated security alert. All incident details have been logged.</strong></p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private static getAdminNotificationText(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    return `
SECURITY INCIDENT ALERT - IMMEDIATE ATTENTION REQUIRED

Incident ID: ${data.incidentId}
Type: ${data.incidentType}
Severity: ${data.severity}
Detected: ${data.detectedAt.toLocaleString()}

DESCRIPTION:
${data.description}

${data.affectedUsers ? `AFFECTED USERS: ${data.affectedUsers}` : ''}

AFFECTED DATA CATEGORIES:
${data.affectedDataCategories.map(category => `• ${this.formatDataCategory(category)}`).join('\n')}

ACTIONS TAKEN:
${data.actionsTaken.map(action => `✅ ${action}`).join('\n')}

NEXT STEPS:
${data.nextSteps.map(step => `📋 ${step}`).join('\n')}

${data.severity === 'CRITICAL' ? `
⚠️ CRITICAL INCIDENT - IMMEDIATE ACTION REQUIRED
This incident requires immediate response within 1 hour:
• Escalate to incident response team
• Begin containment procedures
• Prepare for potential regulatory notification
• Document all response actions
` : ''}

CONTACT:
Security Team: ${data.contactEmail}
${data.contactPhone ? `Emergency Line: ${data.contactPhone}` : ''}
${data.reportedBy ? `Reported By: ${data.reportedBy}` : ''}

Generated: ${new Date().toLocaleString()}
    `;
  }

  private static getRegulatoryNotificationHTML(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Data Breach Notification</title>
    <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.8; margin: 0; padding: 40px; background-color: white; color: #000; }
        .letterhead { border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .official-header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px; }
        .section { margin: 30px 0; }
        .legal-notice { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .signature-block { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="letterhead">
        <h1 style="margin: 0;">OFFICIAL DATA BREACH NOTIFICATION</h1>
        <p style="margin: 5px 0 0 0;">Submitted in accordance with applicable data protection regulations</p>
    </div>

    <div class="official-header">
        NOTIFICATION OF DATA SECURITY INCIDENT<br>
        Reference: ${data.incidentId}
    </div>

    <div class="section">
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>To:</strong> ${recipient.name}</p>
        <p><strong>From:</strong> Data Protection Officer</p>
        <p><strong>Subject:</strong> Mandatory Data Breach Notification - ${data.title}</p>
    </div>

    <div class="legal-notice">
        <p><strong>NOTICE:</strong> This notification is submitted pursuant to applicable data protection laws and regulations, including but not limited to FERPA, COPPA, and state data breach notification laws.</p>
    </div>

    <div class="section">
        <h2>1. INCIDENT DETAILS</h2>
        <table>
            <tr><th>Incident Reference</th><td>${data.incidentId}</td></tr>
            <tr><th>Incident Type</th><td>${data.incidentType.replace('_', ' ')}</td></tr>
            <tr><th>Severity Level</th><td>${data.severity}</td></tr>
            <tr><th>Date/Time Detected</th><td>${data.detectedAt.toLocaleString()}</td></tr>
            <tr><th>Date/Time Reported</th><td>${new Date().toLocaleString()}</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>2. NATURE OF THE INCIDENT</h2>
        <p>${data.description}</p>
    </div>

    <div class="section">
        <h2>3. AFFECTED DATA CATEGORIES</h2>
        <ul>
            ${data.affectedDataCategories.map(category => `<li>${this.formatDataCategory(category)}</li>`).join('')}
        </ul>
        ${data.affectedUsers ? `<p><strong>Estimated Number of Affected Individuals:</strong> ${data.affectedUsers}</p>` : ''}
    </div>

    <div class="section">
        <h2>4. CONTAINMENT AND REMEDIATION MEASURES</h2>
        <h3>Immediate Actions Taken:</h3>
        <ul>
            ${data.actionsTaken.map(action => `<li>${action}</li>`).join('')}
        </ul>
        
        <h3>Planned Remediation Steps:</h3>
        <ul>
            ${data.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>5. NOTIFICATION TO AFFECTED INDIVIDUALS</h2>
        <p>Affected individuals will be notified within 72 hours of this incident being confirmed. Individual notifications will include:</p>
        <ul>
            <li>Description of the incident and affected data</li>
            <li>Steps taken to address the incident</li>
            <li>Recommended actions for affected individuals</li>
            <li>Contact information for questions and support</li>
        </ul>
    </div>

    <div class="section">
        <h2>6. MEASURES TO PREVENT RECURRENCE</h2>
        <p>The following measures are being implemented to prevent similar incidents:</p>
        <ul>
            <li>Enhanced security monitoring and alerting</li>
            <li>Additional staff training on data protection</li>
            <li>Review and update of security policies and procedures</li>
            <li>Implementation of additional technical safeguards</li>
        </ul>
    </div>

    <div class="section">
        <h2>7. CONTACT INFORMATION</h2>
        <p>For questions or additional information regarding this incident:</p>
        <p>
            <strong>Email:</strong> ${data.contactEmail}<br>
            ${data.contactPhone ? `<strong>Phone:</strong> ${data.contactPhone}<br>` : ''}
            <strong>Incident Reference:</strong> ${data.incidentId}
        </p>
    </div>

    <div class="signature-block">
        <p>Respectfully submitted,</p>
        <br><br>
        <p>_________________________________<br>
        Data Protection Officer<br>
        Date: ${new Date().toLocaleDateString()}</p>
    </div>

    <div style="margin-top: 40px; font-size: 12px; color: #666;">
        <p><em>This notification is submitted in accordance with applicable data protection regulations. Please retain this document for your records.</em></p>
    </div>
</body>
</html>
    `;
  }

  private static getRegulatoryNotificationText(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    return `
OFFICIAL DATA BREACH NOTIFICATION
Reference: ${data.incidentId}

Date: ${new Date().toLocaleDateString()}
To: ${recipient.name}
From: Data Protection Officer
Subject: Mandatory Data Breach Notification - ${data.title}

NOTICE: This notification is submitted pursuant to applicable data protection laws and regulations.

1. INCIDENT DETAILS
- Incident Reference: ${data.incidentId}
- Incident Type: ${data.incidentType.replace('_', ' ')}
- Severity Level: ${data.severity}
- Date/Time Detected: ${data.detectedAt.toLocaleString()}
- Date/Time Reported: ${new Date().toLocaleString()}

2. NATURE OF THE INCIDENT
${data.description}

3. AFFECTED DATA CATEGORIES
${data.affectedDataCategories.map(category => `• ${this.formatDataCategory(category)}`).join('\n')}

${data.affectedUsers ? `Estimated Number of Affected Individuals: ${data.affectedUsers}` : ''}

4. CONTAINMENT AND REMEDIATION MEASURES

Immediate Actions Taken:
${data.actionsTaken.map(action => `• ${action}`).join('\n')}

Planned Remediation Steps:
${data.nextSteps.map(step => `• ${step}`).join('\n')}

5. NOTIFICATION TO AFFECTED INDIVIDUALS
Affected individuals will be notified within 72 hours of this incident being confirmed.

6. CONTACT INFORMATION
Email: ${data.contactEmail}
${data.contactPhone ? `Phone: ${data.contactPhone}` : ''}
Incident Reference: ${data.incidentId}

Respectfully submitted,
Data Protection Officer
Date: ${new Date().toLocaleDateString()}
    `;
  }

  private static getFERPABreachNotificationHTML(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>FERPA Breach Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 30px; background-color: #f9fafb; }
        .container { max-width: 700px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .ferpa-header { background: #1f2937; color: white; padding: 30px; border-radius: 8px; margin: -40px -40px 30px -40px; }
        .urgent-notice { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .regulation-reference { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; }
        .timeline { background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; }
        .educational-records { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="ferpa-header">
            <h1 style="margin: 0;">🎓 FERPA BREACH NOTIFICATION</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Educational Records Security Incident Report</p>
        </div>

        <div class="urgent-notice">
            <h2 style="margin-top: 0; color: #dc2626;">URGENT: Educational Records Security Incident</h2>
            <p><strong>This notification is being sent in accordance with the Family Educational Rights and Privacy Act (FERPA) requirements for the protection of student educational records.</strong></p>
        </div>

        <div class="regulation-reference">
            <h3 style="margin-top: 0;">Regulatory Context</h3>
            <p><strong>FERPA (20 U.S.C. § 1232g; 34 CFR Part 99)</strong> requires educational institutions to protect the privacy of student educational records and to notify appropriate parties when unauthorized disclosure occurs.</p>
        </div>

        <h2>Incident Summary</h2>
        <ul>
            <li><strong>Incident ID:</strong> ${data.incidentId}</li>
            <li><strong>Type:</strong> ${data.incidentType.replace('_', ' ')}</li>
            <li><strong>Severity:</strong> ${data.severity}</li>
            <li><strong>Detection Date:</strong> ${data.detectedAt.toLocaleString()}</li>
            <li><strong>Reporting Date:</strong> ${new Date().toLocaleString()}</li>
        </ul>

        <h2>Incident Description</h2>
        <p>${data.description}</p>

        <div class="educational-records">
            <h3 style="margin-top: 0;">Educational Records Potentially Affected</h3>
            <ul>
                ${data.affectedDataCategories.map(category => `<li>${this.formatDataCategory(category)}</li>`).join('')}
            </ul>
            ${data.affectedUsers ? `<p><strong>Estimated Number of Student Records Affected:</strong> ${data.affectedUsers}</p>` : ''}
        </div>

        <div class="timeline">
            <h3 style="margin-top: 0;">⏰ FERPA Compliance Timeline</h3>
            <p><strong>72-Hour Notification Window:</strong> This incident is being reported within the required timeframe for FERPA breach notifications.</p>
            <ul>
                <li><strong>Incident Detected:</strong> ${data.detectedAt.toLocaleString()}</li>
                <li><strong>Investigation Initiated:</strong> Within 2 hours of detection</li>
                <li><strong>Containment Measures:</strong> Implemented immediately</li>
                <li><strong>Notification Sent:</strong> ${new Date().toLocaleString()}</li>
            </ul>
        </div>

        <h2>Immediate Response Actions</h2>
        <ul>
            ${data.actionsTaken.map(action => `<li>✅ ${action}</li>`).join('')}
        </ul>

        <h2>Ongoing Remediation Plan</h2>
        <ul>
            ${data.nextSteps.map(step => `<li>📋 ${step}</li>`).join('')}
        </ul>

        <h2>FERPA Rights and Protections</h2>
        <p>Under FERPA, students and eligible parents have the right to:</p>
        <ul>
            <li>Be notified of any unauthorized disclosure of educational records</li>
            <li>Request information about the scope and nature of the disclosure</li>
            <li>Understand the remediation steps being taken</li>
            <li>File a complaint with the Family Policy Compliance Office if desired</li>
        </ul>

        <h2>Student/Parent Notification</h2>
        <p>All affected students (and parents of students under 18) will be individually notified within 72 hours of this incident confirmation. The notification will include:</p>
        <ul>
            <li>Specific details about what educational records were affected</li>
            <li>Steps being taken to protect their privacy</li>
            <li>Contact information for questions or concerns</li>
            <li>Information about FERPA rights and complaint procedures</li>
        </ul>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p>
                <strong>FERPA Compliance Officer:</strong> ${data.contactEmail}<br>
                ${data.contactPhone ? `<strong>Phone:</strong> ${data.contactPhone}<br>` : ''}
                <strong>Incident Reference:</strong> ${data.incidentId}
            </p>
            <p><strong>Family Policy Compliance Office:</strong><br>
            U.S. Department of Education<br>
            400 Maryland Avenue, SW<br>
            Washington, DC 20202-8520</p>
        </div>

        <div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #6b7280;">
            <p><strong>This is an official FERPA breach notification as required by federal law.</strong></p>
            <p>Document Classification: Confidential - Educational Records Privacy</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private static getFERPABreachNotificationText(
    data: BreachNotificationData,
    recipient: NotificationRecipient
  ): string {
    return `
FERPA BREACH NOTIFICATION
Educational Records Security Incident Report

URGENT: Educational Records Security Incident

This notification is being sent in accordance with the Family Educational Rights and Privacy Act (FERPA) requirements.

REGULATORY CONTEXT:
FERPA (20 U.S.C. § 1232g; 34 CFR Part 99) requires educational institutions to protect student privacy and notify when unauthorized disclosure occurs.

INCIDENT SUMMARY:
- Incident ID: ${data.incidentId}
- Type: ${data.incidentType.replace('_', ' ')}
- Severity: ${data.severity}
- Detection Date: ${data.detectedAt.toLocaleString()}
- Reporting Date: ${new Date().toLocaleString()}

INCIDENT DESCRIPTION:
${data.description}

EDUCATIONAL RECORDS POTENTIALLY AFFECTED:
${data.affectedDataCategories.map(category => `• ${this.formatDataCategory(category)}`).join('\n')}

${data.affectedUsers ? `Estimated Number of Student Records Affected: ${data.affectedUsers}` : ''}

FERPA COMPLIANCE TIMELINE (72-Hour Window):
• Incident Detected: ${data.detectedAt.toLocaleString()}
• Investigation Initiated: Within 2 hours of detection
• Containment Measures: Implemented immediately
• Notification Sent: ${new Date().toLocaleString()}

IMMEDIATE RESPONSE ACTIONS:
${data.actionsTaken.map(action => `✅ ${action}`).join('\n')}

ONGOING REMEDIATION PLAN:
${data.nextSteps.map(step => `📋 ${step}`).join('\n')}

FERPA RIGHTS:
Under FERPA, students and parents have the right to:
• Be notified of unauthorized disclosures
• Request information about the disclosure scope
• Understand remediation steps
• File complaints with the Family Policy Compliance Office

CONTACT INFORMATION:
FERPA Compliance Officer: ${data.contactEmail}
${data.contactPhone ? `Phone: ${data.contactPhone}` : ''}
Incident Reference: ${data.incidentId}

Family Policy Compliance Office:
U.S. Department of Education
400 Maryland Avenue, SW
Washington, DC 20202-8520

This is an official FERPA breach notification as required by federal law.
    `;
  }

  private static formatDataCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'personal_information': 'Personal Information (name, address, contact details)',
      'educational_records': 'Educational Records (grades, transcripts, assessments)',
      'financial_information': 'Financial Information (payment details, billing)',
      'health_records': 'Health Records (medical information, accommodations)',
      'authentication': 'Authentication Data (login credentials)',
      'behavioral_data': 'Behavioral Data (usage patterns, activity logs)',
      'communication': 'Communication Records (messages, emails)',
      'bulk_data': 'Bulk Data Downloads',
      'system_access': 'System Access Logs',
      'student_grades': 'Student Grades and Academic Performance',
      'attendance_records': 'Attendance Records',
      'disciplinary_records': 'Disciplinary Records'
    };

    return categoryMap[category] || category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Export utility functions
export function generateBreachNotification(
  notificationType: 'USER' | 'ADMIN' | 'REGULATORY' | 'FERPA',
  data: BreachNotificationData,
  recipient: NotificationRecipient
) {
  switch (notificationType) {
    case 'USER':
      return BreachNotificationTemplates.generateUserNotificationEmail(data, recipient);
    case 'ADMIN':
      return BreachNotificationTemplates.generateAdminNotificationEmail(data, recipient);
    case 'REGULATORY':
      return BreachNotificationTemplates.generateRegulatoryNotificationEmail(data, recipient);
    case 'FERPA':
      return BreachNotificationTemplates.generateFERPABreachNotification(data, recipient);
    default:
      throw new Error(`Unknown notification type: ${notificationType}`);
  }
}