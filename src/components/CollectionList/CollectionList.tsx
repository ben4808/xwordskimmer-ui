/**
Modify the code in this React component according to the given requirements and remove things 
not in the requirements. Assume that all other components are already in an optimal, working state.

General
- The site is built in React with Typescript.
- The entire site is responsive and works well on both phones and computers. 
- Each component includes an SCSS module and does not use Tailwind or any other additional CSS framework.
- The site supports login with Google OAuth and manages authentication with a JWT token. 
    The JWT token contains a custom claim for the currently logged in username.
The site is styled in Dark Mode, using a standard Dark Mode color set with accent color 
    as a pleasing light blue.
The header is part of the page and does not float on top of the screen.

Collection List page (/collections)
- This view shows a list of clue collections that the user has access to. For each clue collection, 
    there is shown a box with a generic thumbnail image on the left and the following two lines 
    on the right of it: on the first line, the collection title; on the second line, (“By: <Author>”, 
    Public/Unlisted, clue count), separated by "•" characters.
- The thumbnail will be a FontAwesome icon for a collection or list.
- If the user is logged in, across the bottom of the entire collection box will be a progress bar, 
    with green representing Mastered clues, yellow In Progress, and gray Unseen.
- Clicking a collection takes the user to the Collection page for that collection.
- There are 1 or 2 sections of collections shown:	
  1. Your Collections, showing all collections that have been authored or accessed collections by that user, sorted by last accessed date. Only applies to logged in users.
  2. Public Collections, showing all public collections, sorted alphabetically by title.
 */

import { useCallback, useEffect, useState } from "react";
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
        
        // Separate collections based on privacy and user ownership
        const publicCols = response.filter(collection => !collection.isPrivate);
        const userCols = response.filter(collection => 
          collection.isPrivate && 
          user && 
          collection.creator?.id === user.id
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
            {user && userCollections.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Your Collections</h2>
                <div className={styles.collectionList}>
                  {userCollections.map((collection) => (
                    <div
                      key={collection.id}
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
                          By: {collection.author || collection.creator?.firstName || 'Unknown'} • Private • {collection.clueCount} clues
                        </p>
                      </div>
                      {collection.progressData && (() => {
                        const total = collection.progressData.completed + collection.progressData.in_progress + collection.progressData.unseen;
                        return (
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressMastered} 
                              style={{width: `${calculateProgressPercentage(collection.progressData.completed, total)}%`}}
                            ></div>
                            <div 
                              className={styles.progressInProgress} 
                              style={{width: `${calculateProgressPercentage(collection.progressData.in_progress, total)}%`}}
                            ></div>
                            <div 
                              className={styles.progressUnseen} 
                              style={{width: `${calculateProgressPercentage(collection.progressData.unseen, total)}%`}}
                            ></div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Public Collections Section */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Public Collections</h2>
              <div className={styles.collectionList}>
                {publicCollections.map((collection) => (
                  <div
                    key={collection.id}
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
                        By: {collection.author || collection.creator?.firstName || 'Unknown'} • Public • {collection.clueCount} clues
                      </p>
                    </div>
                    {user && collection.progressData && (() => {
                      const total = collection.progressData.completed + collection.progressData.in_progress + collection.progressData.unseen;
                      return (
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressMastered} 
                            style={{width: `${calculateProgressPercentage(collection.progressData.completed, total)}%`}}
                          ></div>
                          <div 
                            className={styles.progressInProgress} 
                            style={{width: `${calculateProgressPercentage(collection.progressData.in_progress, total)}%`}}
                          ></div>
                          <div 
                            className={styles.progressUnseen} 
                            style={{width: `${calculateProgressPercentage(collection.progressData.unseen, total)}%`}}
                          ></div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionList;
