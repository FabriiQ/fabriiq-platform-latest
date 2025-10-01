import { redirect } from "next/navigation";

/**
 * Redirect to the correct attendance page under teachers
 */
export default function CoordinatorAttendancePage() {
  redirect("/admin/coordinator/teachers/attendance");
}
