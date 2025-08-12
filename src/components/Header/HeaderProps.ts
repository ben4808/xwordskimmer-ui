import { User } from "../../models/User";

export interface HeaderProps {
  user: User | null; // User object or null if not logged in
  onLogin: () => void; // Function to handle login
  onLogout: () => void; // Function to handle logout
}
