export function parseParticipants(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    return trimmed
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return [];
}
