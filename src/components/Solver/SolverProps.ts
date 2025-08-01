import { ClueCollection } from "../../models/ClueCollection";

export interface SolverProps {
  clueCollection?: ClueCollection;
  onGoBack: () => void;
  onShowSpanish?: () => void;
  onShowExplanation?: () => void;
  onShowClueList?: () => void;
}
