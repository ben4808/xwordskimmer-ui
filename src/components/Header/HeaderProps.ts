export interface HeaderProps {
  onLogin: () => void; // Function to handle login
  onLogout: () => void; // Function to handle logout
  headerType?: 'main' | 'collection' | 'quiz'; // Type of header to display
  collectionName?: string; // Name of the collection (for collection/quiz headers)
  onBack?: () => void; // Function to handle back navigation
}
