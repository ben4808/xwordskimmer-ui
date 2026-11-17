import { ICruziApi } from '../../api/ICruziApi';

export interface CrosswordCalendarProps {
  api?: ICruziApi;
  /** Date used to initialize the visible month; typically CrosswordList's selected date. */
  selectedDate: Date;
  onClose: () => void;
  /** Publication whose progress is shown when the calendar opens. Defaults to NYT. */
  publicationId?: string;
  /** Called when the user picks a day; parent should update the date and close the overlay. */
  onDateSelect: (date: Date, publicationId: string) => void;
}
