import { useEffect, useState } from 'react';
import { frontierQuery } from '../../api/api';
import { calculateFrontierPriority, deepClone, updateEntriesWithKeyPress } from '../../lib/utils';
import { Entry } from '../../models/Entry';
import EntryComp from '../EntryComp/EntryComp';
import "../Explored/Explored.scss"
import "./Frontier.scss";
import { SolverProps } from './SolverProps';
import { EntryBox } from '../../models/EntryBox';

function Solver(props: SolverProps) {
    const [entryBoxes, setEntryBoxes] = useState([] as EntryBox[]);

    function handleClick(event: any) {
        let target = event.target;
        while (target.classList.length < 1 || target.classList[0] !== "entry-shell") {
            target = target.parentElement;
            if (!target) return;
        }

        let targetKey = target.dataset["key"];
        let newFrontierEntries = deepClone(frontierEntries) as Entry[];
        for (let entry of newFrontierEntries) {
            entry.isSelected = entry.entry === targetKey;
        }
        setFrontierEntries(newFrontierEntries);

        props.entriesSelected([targetKey]);
    }

    function handleMouseDown(event: any) {
        let target = event.target;
        while (target.classList.length < 1 || target.classList[0] !== "entry-shell") {
            target = target.parentElement;
            if (!target) return;
        }

        let targetKey = target.dataset["key"];
        let newFrontierEntries = deepClone(frontierEntries) as Entry[];
        for (let entry of newFrontierEntries) {
            entry.isSelected = entry.entry === targetKey;
        }
        setFrontierEntries(newFrontierEntries);

        props.entriesSelected([targetKey]);
    }

    function handleMouseUp(event: any) {
        let target = event.target;
        while (target.classList.length < 1 || target.classList[0] !== "entry-shell") {
            target = target.parentElement;
            if (!target) return;
        }

        let targetKey = target.dataset["key"];
        let newFrontierEntries = deepClone(frontierEntries) as Entry[];
        for (let entry of newFrontierEntries) {
            entry.isSelected = entry.entry === targetKey;
        }
        setFrontierEntries(newFrontierEntries);

        props.entriesSelected([targetKey]);
    }

    function handleKeyDown(event: any) {
        let key: string = event.key.toUpperCase();

        let newFrontierEntries = deepClone(frontierEntries) as Entry[];
        let selectedEntry = newFrontierEntries.find(x => x.isSelected);
        if (!selectedEntry) return;

        let modifiedEntries = updateEntriesWithKeyPress([selectedEntry], key);

        if (modifiedEntries.length > 0 && !props.exploredEntries.has(modifiedEntries[0].entry)) {
            modifiedEntries[0].displayText = selectedEntry.displayText;
        }

        setFrontierEntries(newFrontierEntries);
        props.entriesModified(modifiedEntries);
    }

    function handleDeselect(event: any) {
        let target = event.target;
        while (target.classList.length < 1 || target.classList[0] !== "entry-shell") {
            target = target.parentElement;
            if (!target) break;
        }

        if (!target) {
            let newFrontierEntries = deepClone(frontierEntries) as Entry[];
            for (let entry of newFrontierEntries) {
                entry.isSelected = false;
            }
            setFrontierEntries(newFrontierEntries);

            props.entriesSelected([]);
        }
    }

    return (
        <div id="Solver">
            <div onKeyDown={handleKeyDown} onClick={handleClick}>
                {entryBoxes.map((entryBox, i) => (
                    <div className="entry-box" data-key={`box${i}`}>
                        {entryBox.letter}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Solver;
