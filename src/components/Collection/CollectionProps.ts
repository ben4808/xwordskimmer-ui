import { User } from "../../models/User";
import { ClueCollection } from "../../models/ClueCollection";

export interface CollectionProps {
    user: User | null; // User object or null if not logged in
    collection: ClueCollection; // The collection data
    onBack: () => void; // Function to go back to collections list
    onStartQuiz: (collectionId: string) => void; // Function to start quiz for this collection
}
