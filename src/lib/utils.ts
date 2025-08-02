// https://stackoverflow.com/questions/38416020/deep-copy-in-es6-using-the-spread-syntax
export function deepClone(obj: any): any {
    if(typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if(obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if(obj instanceof Map) {
        return new Map(Array.from(obj.entries()));
    }

    if(obj instanceof Array) {
        return obj.reduce((arr, item, i) => {
            arr[i] = deepClone(item);
            return arr;
        }, []);
    }

    if(obj instanceof Object) {
        return Object.keys(obj).reduce((newObj: any, key) => {
            newObj[key] = deepClone(obj[key]);
            return newObj;
        }, {})
    }
}

export function mapKeys<TKey, TVal>(map: Map<TKey, TVal>): TKey[] {
    return Array.from(map.keys()) || [];
}

export function mapValues<TKey, TVal>(map: Map<TKey, TVal>): TVal[] {
    return Array.from(map.values()) || [];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function parseDateFromURL (date: string | null): Date {
  if (!date) {
    return new Date(); // Return current date if no date is provided
  }
  let parts = date.split('-');
  let year = parseInt(parts[0]);
  let month = parseInt(parts[1]) - 1; // Months are zero-based in JavaScript
  let day = parseInt(parts[2]);
  return new Date(year, month, day);
}

export function dateToURL(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function displayTextToEntry(text: string): string {
  // Convert display text to entry format
  return text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function breakTextIntoLines(text: string, maxLineLength: number): string[] {
  let words = text.split(' ');
  let lines = [""] as string[];
  let lengths = [0] as number[];
  let curIdx = 0;

  for (let word of words) {
    if (word.length <= (maxLineLength - lines[curIdx].length)) {
      lines[curIdx] += (lines[curIdx].length > 0 ? ' ' : '') + word;
      lengths[curIdx] += word.length;
      continue;
    }

    if (curIdx > 0 && (maxLineLength - lines[curIdx - 1].length) >= (maxLineLength - lines[curIdx].length + word.length)) {
      lines[curIdx] += (lines[curIdx].length > 0 ? ' ' : '') + word;
      lengths[curIdx] += word.length;
      let charsToAddToPreviousLine = maxLineLength - lines[curIdx - 1].length;
      if (lines[curIdx - 1].slice(-1) === '-')
        lines[curIdx - 1] = lines[curIdx - 1].slice(0, -1) + lines[curIdx].slice(0, charsToAddToPreviousLine) + '-';
      else
        lines[curIdx - 1] += ' ' + lines[curIdx].slice(0, charsToAddToPreviousLine) + '-';
      lengths[curIdx - 1] += charsToAddToPreviousLine;
      lengths[curIdx] -= charsToAddToPreviousLine;
      lines[curIdx] = lines[curIdx].slice(charsToAddToPreviousLine);
      continue;
    }

    if ((maxLineLength - lines[curIdx].length) < 3 || word === words[words.length - 1]) {
      curIdx++;
      lines.push(word);
      lengths.push(word.length);
      continue;
    }

    let charsToAdd = maxLineLength - lines[curIdx].length;
  }
}
