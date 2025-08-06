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

function getAlphanumericIndexes(text: string): number[] {
  // Get indexes of alphanumeric characters in the text
  let indexes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/[a-zA-Z0-9]/.test(text[i])) {
      indexes.push(i);
    }
  }
  return indexes;
}

export function breakTextIntoLines(text: string, maxLineLength: number): string[] {
  let words = text.split(' ');
  let wordsLength = words.map(word => word.replace(/[^a-zA-Z0-9]/g, '').length);
  let wordsIndexes = words.map(word => getAlphanumericIndexes(word));
  let lines = [""] as string[];
  let lengths = [0] as number[];
  let curIdx = 0;

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    let len = wordsLength[curIdx];
    if (lengths[curIdx] + len <= maxLineLength) {
      lines[curIdx] += (lines[curIdx] ? ' ' : '') + word;
      lengths[curIdx] += len;
      continue;
    }
    
    if (len > maxLineLength) {
      // If the word is longer than the max line length, split it
      let splitIndex = Math.floor(len / 2);
      let firstPart = word.slice(0, wordsIndexes[i][splitIndex] + 1);
      let secondPart = word.slice(wordsIndexes[i][splitIndex] + 1);

      lines.push(firstPart + '-');
      lengths.push(Math.ceil(len / 2));
      lines.push(secondPart);
      lengths.push(Math.floor(len / 2));
      curIdx += 2;
    } else {
      // Start a new line for the word
      lines.push(word);
      lengths.push(len);
      curIdx++;
    }
  }

  return lines;
}

export function getCruziScoreColor(score: number): string {
    // Ensure score is within the 0-50 range
    score = Math.max(0, Math.min(50, score));

    if (score < 10) {
      return 'Red'; // Scores below 10 are DarkRed
    } else if (score >= 10 && score < 30) {
      // Transition from DarkRed (139,0,0) to LightGray (211,211,211)
      const ratio = (score - 10) / (30 - 10); // 0 at score 10, 1 at score 30
      const red = Math.round(139 * (1 - ratio) + 211 * ratio);
      const green = Math.round(0 * (1 - ratio) + 211 * ratio);
      const blue = Math.round(0 * (1 - ratio) + 211 * ratio);

      return `rgb(${red}, ${green}, ${blue})`;
    } else if (score >= 30 && score <= 50) {
      // Transition from LightGray (211,211,211) to Green (0,128,0)
      const ratio = (score - 30) / (50 - 30); // 0 at score 30, 1 at score 50
      const red = Math.round(211 * (1 - ratio) + 0 * ratio);
      const green = Math.round(211 * (1 - ratio) + 128 * ratio);
      const blue = Math.round(211 * (1 - ratio) + 0 * ratio);

      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      return 'lightgray'; // Should technically only be hit if score is exactly 30
    }
};

export function replaceCharAtIndex(originalString: string, charToAdd: string, index: number): string {
  let paddedString = originalString;
  if (index > originalString.length) {
    const paddingLength = index - originalString.length;
    paddedString += ' '.repeat(paddingLength); // Pad with spaces
  }

  // Split the string into two parts, insert the character, and join them
  const firstPart = paddedString.substring(0, index);
  const secondPart = (index < (paddedString.length - 1)) ? paddedString.substring(index + 1) : '';

  return firstPart + charToAdd + secondPart;
}

export function getTextWidth(text: string, remSize: number, fontFamily: string): number {
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const pixelFontSize = remSize * rootFontSize;
  
  const font = `${pixelFontSize}px ${fontFamily}`;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (context) {
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }
  
  return 0;
}
