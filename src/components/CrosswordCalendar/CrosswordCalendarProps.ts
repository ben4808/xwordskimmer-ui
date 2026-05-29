import { ICruziApi } from '../../api/ICruziApi';

export interface CrosswordCalendarProps {
  api?: ICruziApi;
  /** Date used to initialize the visible month; typically CrosswordList's selected date. */
  selectedDate: Date;
  onClose: () => void;
  /** Called when the user picks a day; parent should update CrosswordList's date and close the overlay. */
  onDateSelect: (date: Date) => void;
}
