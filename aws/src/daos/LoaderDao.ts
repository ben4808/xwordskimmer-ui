import { ILoaderDao } from "./ILoaderDao";
import savePuzzle from "./savePuzzle";
import saveClueCollection from "./saveClueCollection";
import addCluesToCollection from "./addCluesToCollection";
import addTranslateResults from "./addTranslateResults";
import addObscurityQualityResults from "./addObscurityQualityResults";

class LoaderDao implements ILoaderDao {
    savePuzzle = savePuzzle;

    saveClueCollection = saveClueCollection;

    addCluesToCollection = addCluesToCollection;

    addTranslateResults = addTranslateResults;

    addObscurityQualityResults = addObscurityQualityResults;
}

export default LoaderDao;
