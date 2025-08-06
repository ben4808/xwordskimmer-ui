import { ClueCollection } from "../../models/ClueCollection";

export interface SolverProps {
  clueCollection?: ClueCollection;
  returnUrl?: string; // URL to return to after solving
  onGoBack?: () => void;
  onShowSpanish?: () => void;
  onShowExplanation?: () => void;
  onShowClueList?: () => void;
}
