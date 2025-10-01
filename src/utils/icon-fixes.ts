/**
 * Icon fixes for HMR and module loading issues
 * 
 * This utility provides stable icon references to prevent
 * "module factory is not available" errors during HMR updates
 */

import {
  Building,
  Users,
  MapPin,
  Globe,
  Phone,
  Mail,
  Pencil,
  Trash,
  BookOpen,
  Home,
  Settings,
  RefreshCw,
  Trophy,
  Clock,
  Activity,
  ChevronLeft,
  BarChart,
  FileText,
  Target,
  Calendar,
  School,
  GraduationCap,
  Eye,
  UserPlus
} from "lucide-react";

// Create stable references to prevent HMR issues
export const StableIcons = {
  Building,
  Users,
  MapPin,
  Globe,
  Phone,
  Mail,
  Pencil,
  Trash,
  BookOpen,
  Home,
  Settings,
  RefreshCw,
  Trophy,
  Clock,
  Activity,
  ChevronLeft,
  BarChart,
  FileText,
  Target,
  Calendar,
  School,
  GraduationCap,
  Eye,
  UserPlus
} as const;

// Create aliases for commonly used icons
export const BuildingIcon = Building;
export const UsersIcon = Users;
export const MapPinIcon = MapPin;
export const GlobeIcon = Globe;
export const PhoneIcon = Phone;
export const MailIcon = Mail;
export const PencilIcon = Pencil;
export const TrashIcon = Trash;
export const BookOpenIcon = BookOpen;
export const HomeIcon = Home;
export const SettingsIcon = Settings;
export const RefreshCwIcon = RefreshCw;
export const TrophyIcon = Trophy;
export const ClockIcon = Clock;
export const ActivityIcon = Activity;
export const ChevronLeftIcon = ChevronLeft;
export const BarChartIcon = BarChart;
export const FileTextIcon = FileText;
export const TargetIcon = Target;
export const CalendarIcon = Calendar;
export const SchoolIcon = School;
export const GraduationCapIcon = GraduationCap;
export const EyeIcon = Eye;
export const UserPlusIcon = UserPlus;

// Export all icons for easy access
export {
  Building,
  Users,
  MapPin,
  Globe,
  Phone,
  Mail,
  Pencil,
  Trash,
  BookOpen,
  Home,
  Settings,
  RefreshCw,
  Trophy,
  Clock,
  Activity,
  ChevronLeft,
  BarChart,
  FileText,
  Target,
  Calendar,
  School,
  GraduationCap,
  Eye,
  UserPlus
};
