import { ClueCollection } from "../../models/ClueCollection";

export interface CollectionQuizProps {
  clueCollection?: ClueCollection;
  returnUrl?: string; // URL to return to after solving
  onGoBack?: () => void;
  onShowSpanish?: () => void;
  onShowExplanation?: () => void;
  onShowClueList?: () => void;
}
