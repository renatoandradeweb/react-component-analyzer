export function groupCaptures(captures: any[]): any[][] {
  const patternMap = new Map<number, any[]>();

  for (const capture of captures) {
    const patternIndex = capture.pattern;

    if (!patternMap.has(patternIndex)) {
      patternMap.set(patternIndex, []);
    }

    // Verificação de null/undefined
    const capturesForPattern = patternMap.get(patternIndex);
    if (capturesForPattern) {
      capturesForPattern.push(capture);
    }
  }

  return Array.from(patternMap.values());
}