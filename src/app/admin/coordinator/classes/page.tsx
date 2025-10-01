import { redirect } from "next/navigation";

/**
 * Redirect to the correct classes page under performance
 */
export default function CoordinatorClassesPage() {
  redirect("/admin/coordinator/performance/classes");
}
