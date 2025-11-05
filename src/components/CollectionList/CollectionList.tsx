/**
General
- The site is built in React with Typescript.
- The entire site is responsive and works well on both phones and computers. 
- Each component includes an SCSS module and does not use Tailwind or any other additional CSS framework.
- The site supports login with Google OAuth and manages authentication with a JWT token. 
    The login API also provides user information to the client.
The site is styled in Dark Mode, using a standard Dark Mode color set with accent color 
    as a pleasing light blue.
The header is part of the page and does not float on top of the screen.

Collection List page (/collections)
- This view shows a list of clue collections that the user has access to. For each clue collection, 
    there is shown a box with a generic thumbnail image on the left and the following three lines 
    on the right of it: 
    1. The collection title
    2. (“By: <Author>”, Public/Unlisted, clue count), separated by "•" characters.
    3. A progress bar, with green representing Mastered clues, yellow In Progress, and gray Unseen.
      There are no labels for the bar, just a rectangular bar with three sections. The progress bar
      does not show up if there is no logged in user. If there is a user but no progress data, all
      Unseen clues are assumed.
- The thumbnail will be a FontAwesome icon for a collection or list.
- Clicking a collection takes the user to the Collection page for that collection.
- There are 1 or 2 sections of collections shown:	
  1. Your Collections, showing all collections that the user has authored, or collection for which
     the user has progress data. Sorted by last accessed date. Only applies to logged in users.
  2. Public Collections, showing all public collections, sorted alphabetically by title.
 */

import { Fragment, useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList } from '@fortawesome/free-solid-svg-icons';
import { CollectionListProps } from "./CollectionListProps";
import styles from './CollectionList.module.scss';
import { useNavigate } from "react-router-dom";
import { ClueCollection } from "../../models/ClueCollection";
import CruziApi from "../../api/CruziApi";
import { useAuth } from "../../contexts/AuthContext";

function CollectionList(props: CollectionListProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [collections, setCollections] = useState<ClueCollection[]>([]);
    const [userCollections, setUserCollections] = useState<ClueCollection[]>([]);
    const [publicCollections, setPublicCollections] = useState<ClueCollection[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const api = CruziApi;

    const fetchCollections = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getCollectionList();
        setCollections(response);
        
        // Separate collections: "Your Collections" includes collections authored by user or with progress data
        const userCols: ClueCollection[] = [];
        if (user) {
          userCols.push(...response.filter(collection => 
            // User authored collections (any privacy level)
            (collection.creator?.id === user.id) ||
            // Collections with progress data (any privacy level) - API should only return current user's progress
            (collection.progressData && (!collection.progressData.userId || collection.progressData.userId === user.id))
          ));
        }
        
        // Get user collection IDs to exclude from public collections
        const userCollectionIds = new Set(userCols.map(col => col.id));
        
        // Public collections exclude those already in "Your Collections"
        const publicCols = response.filter(collection => 
          !collection.isPrivate && !userCollectionIds.has(collection.id)
        );
        
        // Sort public collections alphabetically by title
        setPublicCollections(publicCols.sort((a, b) => a.title.localeCompare(b.title)));
        
        // Sort user collections by last accessed date (using modifiedDate as proxy)
        setUserCollections(userCols.sort((a, b) => 
          new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime()
        ));
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError('Failed to load collections. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, [user]);

    useEffect(() => {
      fetchCollections();
    }, [fetchCollections]);

    const handleCollectionClick = (collection: ClueCollection) => {
      navigate(`/collection/${collection.id}`);
    };

    // Helper function to calculate progress percentage safely
    const calculateProgressPercentage = (value: number, total: number): number => {
      if (total === 0) return 0;
      return (value / total) * 100;
    };

    // Helper function to render progress bar
    const renderProgressBar = (collection: ClueCollection) => {
      if (!user) return null;
      
      const completed = collection.progressData?.completed || 0;
      const inProgress = collection.progressData?.in_progress || 0;
      const unseen = collection.progressData?.unseen ?? (collection.clueCount || 0);
      const total = completed + inProgress + unseen;
      
      if (total === 0) return null;
      
      return (
        <div className={styles.progressBar}>
          <div 
            className={styles.progressMastered} 
            style={{width: `${calculateProgressPercentage(completed, total)}%`}}
          ></div>
          <div 
            className={styles.progressInProgress} 
            style={{width: `${calculateProgressPercentage(inProgress, total)}%`}}
          ></div>
          <div 
            className={styles.progressUnseen} 
            style={{width: `${calculateProgressPercentage(unseen, total)}%`}}
          ></div>
        </div>
      );
    };

    // Helper function to render collection card
    const renderCollectionCard = (collection: ClueCollection, showPrivacyStatus: boolean = true) => {
      const privacyText = showPrivacyStatus 
        ? (collection.isPrivate ? 'Unlisted' : 'Public')
        : 'Public';
      
      return (
        <div
          className={styles.collectionCard}
          onClick={() => handleCollectionClick(collection)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCollectionClick(collection);
            }
          }}
        >
          <div className={styles.thumbnail}>
            <FontAwesomeIcon icon={faList} />
          </div>
          <div className={styles.details}>
            <h3 className={styles.title}>{collection.title}</h3>
            <p className={styles.meta}>
              By: {collection.author || collection.creator?.firstName || 'Unknown'} • {privacyText} • {collection.clueCount} clues
            </p>
            {renderProgressBar(collection)}
          </div>
        </div>
      );
    };

    // Helper function to render collection section
    const renderCollectionSection = (title: string, collections: ClueCollection[], showPrivacyStatus: boolean = true) => {
      if (collections.length === 0) return null;
      
      return (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <div className={styles.collectionList}>
            {collections.map((collection) => (
              <Fragment key={collection.id}>
                {renderCollectionCard(collection, showPrivacyStatus)}
              </Fragment>
            ))}
          </div>
        </div>
      );
    };

    return (
    <div className={styles.collectionListPage}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Collections</h1>
      </div>

      <div className={styles.contentArea}>
        {isLoading && <div className={styles.loading}>Loading collections...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!isLoading && !error && collections.length === 0 && (
          <div className={styles.noCollections}>No collections found.</div>
        )}
        {!isLoading && !error && collections.length > 0 && (
          <div className={styles.collectionsContainer}>
            {/* Your Collections Section - only show if user is logged in and has collections */}
            {user && renderCollectionSection('Your Collections', userCollections, true)}
            
            {/* Public Collections Section */}
            {renderCollectionSection('Public Collections', publicCollections, false)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionList;
