import { useState, useRef, useEffect } from "react";
import { CollectionTableProps } from "./CollectionTableProps";
import styles from './CollectionTable.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faFilter, faTrash } from '@fortawesome/free-solid-svg-icons';
import CruziApi from "../../api/CruziApi";
import { CollectionClueTableRow } from "cruzi-models";

type SortColumn = 'Answer' | 'Progress' | null;
type SortDirection = 'asc' | 'desc';
type ProgressFilter = 'All' | 'Unseen' | 'In Progress' | 'Completed';
type StatusFilter = 'All' | 'Ready' | 'Processing' | 'Invalid';

function CollectionTable(props: CollectionTableProps) {
    const { collectionId } = props;

    const [clues, setClues] = useState<CollectionClueTableRow[]>([]);
    const [cluesLoading, setCluesLoading] = useState<boolean>(false);
    const [sortColumn, setSortColumn] = useState<SortColumn>('Answer');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [progressFilter, setProgressFilter] = useState<ProgressFilter>('All');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [showProgressFilter, setShowProgressFilter] = useState<boolean>(false);
    const [showStatusFilter, setShowStatusFilter] = useState<boolean>(false);
    const [hasMorePages, setHasMorePages] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [showToast, setShowToast] = useState<boolean>(false);

    const progressFilterRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);
    const [showSenseDropdown, setShowSenseDropdown] = useState<string | null>(null);
    const senseDropdownRef = useRef<HTMLDivElement>(null);
    const [senseDropdownTrigger, setSenseDropdownTrigger] = useState<string | null>(null);

    // Fetch clues whenever sort, filter, or page changes
    useEffect(() => {
        const fetchClues = async () => {
            setCluesLoading(true);
            try {
                const sortBy = sortColumn || 'Answer';
                const sortDir = sortDirection;
                const progressFilterValue = progressFilter !== 'All' ? progressFilter : undefined;
                const statusFilterValue = statusFilter !== 'All' ? statusFilter : undefined;

                const results = await CruziApi.getCollectionClues(
                    collectionId,
                    sortBy,
                    sortDir,
                    progressFilterValue,
                    statusFilterValue,
                    currentPage
                );

                setClues(results);
                // If we got exactly 100 results, there might be more pages
                setHasMorePages(results.length === 100);
            } catch (error) {
                console.error('Error fetching collection clues:', error);
                setClues([]);
                setHasMorePages(false);
            } finally {
                setCluesLoading(false);
            }
        };

        fetchClues();
    }, [collectionId, sortColumn, sortDirection, progressFilter, statusFilter, currentPage]);

    // Reset to page 1 when filters or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [progressFilter, statusFilter, sortColumn, sortDirection]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (progressFilterRef.current && !progressFilterRef.current.contains(event.target as Node)) {
                setShowProgressFilter(false);
            }
            if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
                setShowStatusFilter(false);
            }
            if (senseDropdownRef.current && !senseDropdownRef.current.contains(event.target as Node)) {
                setShowSenseDropdown(null);
            }
            if (senseDropdownTrigger !== showSenseDropdown) {
                setSenseDropdownTrigger(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            // Toggle direction
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New column, default to ascending
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleProgressFilterChange = (filter: ProgressFilter) => {
        setProgressFilter(filter);
        setShowProgressFilter(false);
    };

    const handleStatusFilterChange = (filter: StatusFilter) => {
        setStatusFilter(filter);
        setShowStatusFilter(false);
    };

    const handleDeleteClue = async (clueId: string, answer: string) => {
        const confirmed = window.confirm(`Are you sure you want to delete the clue "${answer}" from this collection?`);
        if (!confirmed) return;

        try {
            await CruziApi.removeClueFromCollection(collectionId, clueId);

            // Refresh the clues list
            const sortBy = sortColumn || 'Answer';
            const sortDir = sortDirection;
            const progressFilterValue = progressFilter !== 'All' ? progressFilter : undefined;
            const statusFilterValue = statusFilter !== 'All' ? statusFilter : undefined;

            const results = await CruziApi.getCollectionClues(
                collectionId,
                sortBy,
                sortDir,
                progressFilterValue,
                statusFilterValue,
                currentPage
            );

            setClues(results);
            setHasMorePages(results.length === 100);

            // Show success toast
            setToastMessage(`Clue "${answer}" has been deleted from the collection.`);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('Error deleting clue:', error);
            setToastMessage("Error deleting clue. Please try again.");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const handleUpdateSense = async (clueId: string, senseId: string) => {
        try {
            await CruziApi.updateClueSense(clueId, senseId);
            setShowSenseDropdown(null);

            // Update the local state instead of refetching all data
            setClues(prevClues =>
                prevClues.map(clue => {
                    if (clue.id === clueId) {
                        const selectedSense = clue.senses?.find(s => s.senseId === senseId);
                        return { ...clue, sense: selectedSense?.senseSummary || senseId };
                    }
                    return clue;
                })
            );

            // Show success toast
            setToastMessage("Sense updated successfully.");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('Error updating sense:', error);
            setToastMessage("Error updating sense. Please try again.");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const getSortIcon = (column: SortColumn) => {
        if (sortColumn !== column) {
            return <FontAwesomeIcon icon={faSort} className={styles.sortIcon} />;
        }
        return sortDirection === 'asc' 
            ? <FontAwesomeIcon icon={faSortUp} className={styles.sortIcon} />
            : <FontAwesomeIcon icon={faSortDown} className={styles.sortIcon} />;
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.wordsTable}>
                <thead>
                    <tr>
                        <th 
                            className={styles.sortableHeader}
                            onClick={() => handleSort('Answer')}
                        >
                            <span className={styles.headerContent}>
                                Answer
                                {getSortIcon('Answer')}
                            </span>
                        </th>
                        <th>Sense</th>
                        <th>Clue</th>
                        <th 
                            className={styles.sortableHeader}
                            onClick={() => handleSort('Progress')}
                        >
                            <span className={styles.headerContent}>
                                Progress
                                {getSortIcon('Progress')}
                                <span 
                                    className={styles.filterIcon}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProgressFilter(!showProgressFilter);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faFilter} />
                                </span>
                            </span>
                            {showProgressFilter && (
                                <div ref={progressFilterRef} className={styles.filterDropdown}>
                                    <div 
                                        className={progressFilter === 'All' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleProgressFilterChange('All')}
                                    >
                                        All
                                    </div>
                                    <div 
                                        className={progressFilter === 'Unseen' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleProgressFilterChange('Unseen')}
                                    >
                                        Unseen
                                    </div>
                                    <div 
                                        className={progressFilter === 'In Progress' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleProgressFilterChange('In Progress')}
                                    >
                                        In Progress
                                    </div>
                                    <div 
                                        className={progressFilter === 'Completed' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleProgressFilterChange('Completed')}
                                    >
                                        Completed
                                    </div>
                                </div>
                            )}
                        </th>
                        <th>
                            <span className={styles.headerContent}>
                                Status
                                <span 
                                    className={styles.filterIcon}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowStatusFilter(!showStatusFilter);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faFilter} />
                                </span>
                            </span>
                            {showStatusFilter && (
                                <div ref={statusFilterRef} className={styles.filterDropdown}>
                                    <div 
                                        className={statusFilter === 'All' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleStatusFilterChange('All')}
                                    >
                                        All
                                    </div>
                                    <div 
                                        className={statusFilter === 'Ready' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleStatusFilterChange('Ready')}
                                    >
                                        Ready
                                    </div>
                                    <div 
                                        className={statusFilter === 'Processing' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleStatusFilterChange('Processing')}
                                    >
                                        Processing
                                    </div>
                                    <div 
                                        className={statusFilter === 'Invalid' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleStatusFilterChange('Invalid')}
                                    >
                                        Invalid
                                    </div>
                                </div>
                            )}
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {cluesLoading ? (
                        <tr>
                            <td colSpan={6} className={styles.noData}>Loading clues...</td>
                        </tr>
                    ) : clues.length > 0 ? clues.map((clue, index) => {
                        // Determine status class
                        const statusText = clue.status;
                        let statusClass = styles.statusReady;
                        if (statusText === 'Processing') {
                            statusClass = styles.statusProcessing;
                        } else if (statusText === 'Invalid') {
                            statusClass = styles.statusInvalid;
                        }
                        
                        return (
                            <tr key={clue.id || index}>
                                <td>{clue.answer}</td>
                                <td className={styles.senseCell}>
                                    <div className={styles.senseContainer}>
                                        <span>{clue.sense || 'N/A'}</span>
                                        {clue.senses && clue.senses.length > 0 && (
                                            <>
                                                <span
                                                    className={styles.senseDropdownTrigger}
                                                    onMouseEnter={() => setSenseDropdownTrigger(clue.id)}
                                                    onMouseLeave={() => setSenseDropdownTrigger(null)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowSenseDropdown(showSenseDropdown === clue.id ? null : clue.id);
                                                    }}
                                                    title="Change sense"
                                                >
                                                    ▼
                                                </span>
                                                {showSenseDropdown === clue.id && (
                                                    <div ref={senseDropdownRef} className={styles.senseDropdown}>
                                                        {clue.senses.map((sense) => (
                                                            <div
                                                                key={sense.senseId}
                                                                className={`${styles.senseOption} ${sense.senseSummary === clue.sense ? styles.senseOptionSelected : ''}`}
                                                                onClick={() => handleUpdateSense(clue.id, sense.senseId)}
                                                            >
                                                                {sense.senseSummary}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td>{clue.clue || 'N/A'}</td>
                                <td>{clue.progress}</td>
                                <td>
                                    <span className={`${styles.status} ${statusClass}`}>
                                        {statusText}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={() => handleDeleteClue(clue.id, clue.answer)}
                                        title="Delete clue from collection"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={6} className={styles.noData}>No clues available</td>
                        </tr>
                    )}
                </tbody>
            </table>
            {!cluesLoading && clues.length > 0 && (
                <div className={styles.pagination}>
                    <button 
                        className={styles.paginationButton}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span className={styles.paginationInfo}>
                        Page {currentPage}{hasMorePages ? ' (more pages available)' : ''}
                    </span>
                    <button 
                        className={styles.paginationButton}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!hasMorePages}
                    >
                        Next
                    </button>
                </div>
            )}
            {showToast && (
                <div className={styles.toast}>
                    {toastMessage}
                </div>
            )}
        </div>
    );
}

export default CollectionTable;
