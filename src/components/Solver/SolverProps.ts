import { ClueCollection } from "../../models/ClueCollection";

export interface SolverProps {
  clueCollection?: ClueCollection;
  onShowSpanish?: () => void;
  onShowExplanation?: () => void;
  onShowClueList?: () => void;
}
