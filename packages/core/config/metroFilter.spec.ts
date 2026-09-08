import { METRO_ANY, isMetroAnySelection, normalizePreferredMetroStations } from './metroFilter';

describe('isMetroAnySelection', () => {
  it('is true only for the lone sentinel', () => {
    expect(isMetroAnySelection([METRO_ANY])).toBe(true);
    expect(isMetroAnySelection([])).toBe(false);
    expect(isMetroAnySelection([METRO_ANY, 'Маяковская'])).toBe(false);
  });
});

describe('normalizePreferredMetroStations', () => {
  it('keeps the chosen stations for a metro city', () => {
    expect(normalizePreferredMetroStations('kazan', ['Кремлёвская'])).toEqual(['Кремлёвская']);
  });

  it('keeps an empty selection for a metro city so the form still asks for it', () => {
    expect(normalizePreferredMetroStations('spb', [])).toEqual([]);
  });

  it('stores the "any station" sentinel for a city without metro', () => {
    expect(normalizePreferredMetroStations('krasnodar', [])).toEqual([METRO_ANY]);
    expect(normalizePreferredMetroStations('krasnodar', ['Кремлёвская'])).toEqual([METRO_ANY]);
  });
});
