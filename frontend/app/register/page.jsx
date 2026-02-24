/**
 * /register → redirects to /login
 *
 * Registration is handled as part of the OTP login flow:
 *   1. User enters phone → receives OTP
 *   2. OTP verified → if new number, registration form shown inline
 *   3. Account created → logged in automatically
 */
import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/login");
}
