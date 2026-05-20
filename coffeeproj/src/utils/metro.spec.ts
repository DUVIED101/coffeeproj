import { MetroService } from './metro';

describe('MetroService', () => {
  describe('getAllStations', () => {
    it('returns the full Saint Petersburg list', () => {
      expect(MetroService.getAllStations('spb')).toHaveLength(75);
    });

    it('returns the full Moscow list', () => {
      expect(MetroService.getAllStations('moscow')).toHaveLength(304);
    });
  });

  describe('searchStations', () => {
    it('scopes results to the requested city — Маяковская exists in both cities and must not cross-leak', () => {
      const moscowResults = MetroService.searchStations('Маяковская', 'moscow');
      const spbResults = MetroService.searchStations('Маяковская', 'spb');

      expect(moscowResults.map(s => s.line)).toEqual(['Замоскворецкая']);
      expect(spbResults.map(s => s.line)).toEqual(['Невско-Василеостровская']);
    });

    it('returns the full list when the query is empty', () => {
      expect(MetroService.searchStations('', 'moscow')).toHaveLength(304);
    });

    it('is case-insensitive and matches Russian and English names', () => {
      const ru = MetroService.searchStations('охотный', 'moscow');
      const en = MetroService.searchStations('OKHOTNY', 'moscow');

      expect(ru.map(s => s.name)).toEqual(['Охотный Ряд']);
      expect(en.map(s => s.name)).toEqual(['Охотный Ряд']);
    });
  });

  describe('getUniqueLines', () => {
    it('includes the 16 active Moscow lines as of 2026', () => {
      const lines = MetroService.getUniqueLines('moscow').map(line => line.name);

      expect(lines).toEqual([
        'Сокольническая',
        'Замоскворецкая',
        'Арбатско-Покровская',
        'Филёвская',
        'Кольцевая',
        'Калужско-Рижская',
        'Таганско-Краснопресненская',
        'Калининская',
        'Серпуховско-Тимирязевская',
        'Люблинско-Дмитровская',
        'Большая кольцевая',
        'Бутовская',
        'МЦК',
        'Некрасовская',
        'Троицкая',
        'Солнцевская',
      ]);
    });

    it('preserves the existing 6 Saint Petersburg lines', () => {
      expect(MetroService.getUniqueLines('spb')).toHaveLength(6);
    });
  });

  describe('getStationByName', () => {
    it('finds a station by Russian name within the requested city only', () => {
      const station = MetroService.getStationByName('Бульвар Рокоссовского', 'moscow');

      expect(station?.line).toBe('Сокольническая');
      expect(MetroService.getStationByName('Бульвар Рокоссовского', 'spb')).toBeUndefined();
    });
  });

  describe('formatDistance', () => {
    it('formats sub-kilometre distances in metres', () => {
      expect(MetroService.formatDistance(742)).toBe('742 м');
    });

    it('formats kilometre-scale distances with one decimal', () => {
      expect(MetroService.formatDistance(2350)).toBe('2.4 км');
    });
  });
});
