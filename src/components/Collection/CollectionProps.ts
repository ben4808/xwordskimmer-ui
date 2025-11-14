export interface CollectionProps {
    onBack: () => void; // Function to go back to collections list
    onStartQuiz: (collectionId: string) => void; // Function to start quiz for this collection
}
