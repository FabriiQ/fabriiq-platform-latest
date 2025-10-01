/**
 * Campus Admin Communications Page Route
 * Provides access to campus-specific communication management dashboard
 */

import { Metadata } from 'next';
import CampusAdminCommunicationPage from '../communication';

export const metadata: Metadata = {
  title: 'Communications | Campus Admin',
  description: 'Campus-specific messaging management and compliance monitoring',
};

export default function CommunicationsPage() {
  return <CampusAdminCommunicationPage />;
}
