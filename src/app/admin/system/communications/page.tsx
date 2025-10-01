/**
 * System Admin Communications Page Route
 * Provides access to the comprehensive communication management dashboard
 */

import { Metadata } from 'next';
import SystemAdminCommunicationPage from '../communication';

export const metadata: Metadata = {
  title: 'Communications | System Admin',
  description: 'System-wide messaging management and compliance monitoring',
};

export default function CommunicationsPage() {
  return <SystemAdminCommunicationPage />;
}
