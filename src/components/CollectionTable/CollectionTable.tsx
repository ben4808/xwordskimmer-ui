/**
Collection Details Popup Table
This table shows words and phrases in the collection, with the following fields. Note that these 
fields are returned in a tailored fashion by the API getCollectionClues in the format of 
CollectionClueRow. Reference cruzi_sps.sql for details on how these fields are returned.

All sortable columns should be clickable in the header to sort by that column. There should also
be a little fontawesome arrow next to the header of the sorted column to indicate the sort direction.
All filterable columns should have a dropdown menu with the options to filter by that column.
This dropdown should be triggered by a filter fontawesome icon next to the column header.

- Answer
   - This column is sortable alphabetically forward and backward.
- Sense
   - "N/A" if no data is returned.
- Clue
   - "N/A" if no data is returned.
- Progress
   - If the result is "Unseen" or "Mastered", show this text.
   - Otherwise, parse out the number of correct solves and the solves needed. But still display 
     the text as for example "2/4" or "3/10".
   - This column is sortable. In sorting, Mastered clues come first (sorted alphabetically),
      followed by In Progress clues (sorted by the number of solves needed descending), followed
	  by "Unseen" clues (sorted alphabetically).
   - This column is filterable by the 3 major categories (Unseen, In Progress, Mastered)
- Status
   - This column is filterable by the 3 major categories (Ready, Processing, Invalid)

At the bottom of the table, there should be a pagination control with 100 results per page.
*/

import { useState, useRef, useEffect } from "react";
import { CollectionTableProps } from "./CollectionTableProps";
import styles from './CollectionTable.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faFilter } from '@fortawesome/free-solid-svg-icons';
import CruziApi from "../../api/CruziApi";
import { CollectionClueRow } from "../../models/CollectionClueRow";

type SortColumn = 'Answer' | 'Progress' | null;
type SortDirection = 'asc' | 'desc';
type ProgressFilter = 'All' | 'Unseen' | 'In Progress' | 'Mastered';
type StatusFilter = 'All' | 'Ready' | 'Processing' | 'Invalid';

function CollectionTable(props: CollectionTableProps) {
    const { collectionId } = props;

    const [clues, setClues] = useState<CollectionClueRow[]>([]);
    const [cluesLoading, setCluesLoading] = useState<boolean>(false);
    const [sortColumn, setSortColumn] = useState<SortColumn>('Answer');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [progressFilter, setProgressFilter] = useState<ProgressFilter>('All');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [showProgressFilter, setShowProgressFilter] = useState<boolean>(false);
    const [showStatusFilter, setShowStatusFilter] = useState<boolean>(false);
    const [hasMorePages, setHasMorePages] = useState<boolean>(false);

    const progressFilterRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);

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
                                        className={progressFilter === 'Mastered' ? styles.filterOptionActive : styles.filterOption}
                                        onClick={() => handleProgressFilterChange('Mastered')}
                                    >
                                        Mastered
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
                    </tr>
                </thead>
                <tbody>
                    {cluesLoading ? (
                        <tr>
                            <td colSpan={5} className={styles.noData}>Loading clues...</td>
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
                                <td>{clue.sense}</td>
                                <td>{clue.clue}</td>
                                <td>{clue.progress}</td>
                                <td>
                                    <span className={`${styles.status} ${statusClass}`}>
                                        {statusText}
                                    </span>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={5} className={styles.noData}>No clues available</td>
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
        </div>
    );
}

export default CollectionTable;
