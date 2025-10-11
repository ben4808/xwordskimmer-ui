import { User } from "../../models/User";

export interface CollectionListProps {
    user: User | null; // User object or null if not logged in
}
