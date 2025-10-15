import { ClueCollection } from "../../models/ClueCollection";

export interface CollectionProps {
    collection: ClueCollection; // The collection data
    onBack: () => void; // Function to go back to collections list
    onStartQuiz: (collectionId: string) => void; // Function to start quiz for this collection
}
