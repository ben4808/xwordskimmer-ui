import { ClueCollection } from "../../models/ClueCollection";

export interface CollectionPlayerProps {
  clueCollection?: ClueCollection;
  onGoBack: () => void;
  onShowSpanish?: () => void;
  onShowExplanation?: () => void;
  onShowClueList?: () => void;
}
