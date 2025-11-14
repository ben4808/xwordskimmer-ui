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

Collection page (/collection/<id>)
- At the top, there is a progress indication section.
    - First, is shown "<count> total clues"
    - Beside this line is a list Fontawesome icon that opens a popup window. In this popup window 
        is a table of words and phrases in the collection (see CollectionTable component for details).
    - The next line says "<count> Completed", "<count> In Progress", and "<count> Unseen", 
        separated by some space. Any clue without progress data is assumed to be Unseen.
        - Not shown if there is no logged in user.
    - Right below these counts is a progress bar, with green representing Completed clues, yellow In Progress, 
      and gray Unseen. There are no labels for the bar, just a rectangular bar with three sections.
      Absense of progress data is assumed to be Unseen.
        - Not shown if there is no logged in user.
- Next there is a text box with placeholder text "Add a word or phrase" and a Add button right next to it.
    This adds a new word or phrase to the collection, confirmed with a toast. Pressing Enter with
    the textbox focused does the same thing as pushing the Add button.
- A "Start Quiz" button that takes the user to the Collection Quiz page for this collection.
*/

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faTimes } from '@fortawesome/free-solid-svg-icons';
import { CollectionProps } from "./CollectionProps";
import styles from './Collection.module.scss';
import CruziApi from "../../api/CruziApi";
import { useAuth } from "../../contexts/AuthContext";
import { useCollection } from "../../contexts/CollectionContext";
import CollectionTable from "../CollectionTable/CollectionTable";
import { displayTextToEntry } from "../../lib/utils";
import { ClueCollection } from "../../models/ClueCollection";

function Collection(props: CollectionProps) {
    const { id: collectionId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { setCurrentCollection } = useCollection();
    const [collection, setCollection] = useState<ClueCollection | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newWord, setNewWord] = useState<string>("");
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [showToast, setShowToast] = useState<boolean>(false);
    const [isAddingWord, setIsAddingWord] = useState<boolean>(false);

    const popupRef = useRef<HTMLDivElement>(null);
    const api = CruziApi;

    // Fetch collection data
    const fetchCollection = useCallback(async () => {
        if (!collectionId) return;

        setIsLoading(true);
        setError(null);
        try {
            const fetchedCollection = await api.getCollectionById(collectionId);
            if (fetchedCollection) {
                setCollection(fetchedCollection);
                setCurrentCollection(fetchedCollection);
            } else {
                setError("Collection not found");
            }
        } catch (err) {
            console.error('Error fetching collection:', err);
            setError("Failed to load collection");
        } finally {
            setIsLoading(false);
        }
    }, [collectionId, api, setCurrentCollection]);

    // Fetch collection on mount and when collectionId changes
    useEffect(() => {
        if (collectionId) {
            fetchCollection();
        }

        // Clean up when component unmounts
        return () => {
            setCurrentCollection(null);
        };
    }, [collectionId, setCurrentCollection, fetchCollection]);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsPopupOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle loading and error states
    if (isLoading) {
        return <div>Loading collection...</div>;
    }

    if (error || !collection) {
        return <div>Error: {error || "Collection not found"}</div>;
    }

    // Get progress data from collection state
    const totalClues = collection.clueCount || 0;
    const progressData = collection.progressData;

    // Calculate progress stats from collection
    const completed = user && progressData ? progressData.completed : 0;
    const inProgress = user && progressData ? progressData.in_progress : 0;
    const unseen = user && progressData ? progressData.unseen : (user ? totalClues : 0);


    // Handle word input change
    const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewWord(value);
    };

    // Handle adding a new word
    const handleAddWord = async () => {
        if (!newWord.trim() || isAddingWord) return;

        setIsAddingWord(true);
        try {
            let sourceText = "user_" + (user ? user.id : "guest");
            
            // Create a new clue object for the word
            const newInfo = {
                entry: {
                    entry: displayTextToEntry(newWord),
                    lang: collection.lang,
                    displayText: newWord,
                },
                source: sourceText,
            };

            // Use CruziApi to add the clue to the collection
            await api.addCluesToCollection(collection.id!, [newInfo]);

            setToastMessage(`"${newWord}" added to collection`);
            setShowToast(true);
            setNewWord("");

            // Refetch collection data to update clue count and progress
            await fetchCollection();

            // Hide toast after 3 seconds
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('Error adding word:', error);
            setToastMessage("Error adding word. Please try again.");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setIsAddingWord(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddWord();
        }
    };

    // Calculate progress percentages
    const calculateProgressPercentage = (value: number, total: number): number => {
        if (total === 0) return 0;
        return (value / total) * 100;
    };

    return (
        <div className={styles.collectionPage}>
            {/* Progress Indication Section */}
            <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                    <span className={styles.totalClues}>{totalClues} total clues</span>
                    <button 
                        className={styles.listIcon}
                        onClick={() => setIsPopupOpen(true)}
                        aria-label="View collection details"
                    >
                        <FontAwesomeIcon icon={faList} />
                    </button>
                </div>
                
                {user && (
                    <>
                        <div className={styles.progressStats}>
                            <span className={styles.stat}>{completed} Completed</span>
                            <span className={styles.stat}>{inProgress} In Progress</span>
                            <span className={styles.stat}>{unseen} Unseen</span>
                        </div>
                        
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressCompleted} 
                                style={{width: `${calculateProgressPercentage(completed, totalClues)}%`}}
                            ></div>
                            <div 
                                className={styles.progressInProgress} 
                                style={{width: `${calculateProgressPercentage(inProgress, totalClues)}%`}}
                            ></div>
                            <div 
                                className={styles.progressUnseen} 
                                style={{width: `${calculateProgressPercentage(unseen, totalClues)}%`}}
                            ></div>
                        </div>
                    </>
                )}
            </div>

            {/* Add Word Section */}
            <div className={styles.addWordSection}>
                <div className={styles.addWordContainer}>
                    <input
                        type="text"
                        value={newWord}
                        onChange={handleWordChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a word or phrase"
                        className={styles.wordInput}
                    />
                    <button
                        onClick={handleAddWord}
                        disabled={!newWord.trim() || isAddingWord}
                        className={styles.addButton}
                    >
                        {isAddingWord ? "Adding..." : "Add"}
                    </button>
                </div>
            </div>

            {/* Start Quiz Button */}
            <div className={styles.quizSection}>
                <button
                    onClick={() => props.onStartQuiz(collection.id!)}
                    className={styles.startQuizButton}
                >
                    Start Quiz
                </button>
            </div>

            {/* Collection Details Popup */}
            {isPopupOpen && (
                <div className={styles.popupOverlay}>
                    <div className={styles.popupContent} ref={popupRef}>
                        <div className={styles.popupHeader}>
                            <h3>Collection Details</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setIsPopupOpen(false)}
                                aria-label="Close popup"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className={styles.popupBody}>
                            <CollectionTable
                                collectionId={collection.id!}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div className={styles.toast}>
                    {toastMessage}
                </div>
            )}
        </div>
    );
}

export default Collection;
