import { CITY_BOUNDS, isInsideBounds, type CityCode } from '../types/city';
import { METRO_CITY_CODES, MetroService } from './metro';

const NEW_METRO_CITIES: ReadonlyArray<{
  city: CityCode;
  stations: number;
  lines: string[];
}> = [
  {
    city: 'nizhny_novgorod',
    stations: 16,
    lines: ['Автозаводская', 'Сормовско-Мещерская'],
  },
  { city: 'kazan', stations: 11, lines: ['Центральная'] },
  { city: 'novosibirsk', stations: 14, lines: ['Ленинская', 'Дзержинская'] },
  { city: 'samara', stations: 10, lines: ['Первая'] },
  { city: 'yekaterinburg', stations: 9, lines: ['Уральская'] },
];

describe('MetroService', () => {
  describe('getAllStations', () => {
    it('returns the full Saint Petersburg list', () => {
      expect(MetroService.getAllStations('spb')).toHaveLength(75);
    });

    it('returns the full Moscow list', () => {
      expect(MetroService.getAllStations('moscow')).toHaveLength(304);
    });

    it.each(NEW_METRO_CITIES)(
      'returns the 2026 station list for $city (Московская counted once per line)',
      ({ city, stations }) => {
        expect(MetroService.getAllStations(city)).toHaveLength(stations);
      }
    );

    it('returns an empty list for a city without metro instead of throwing', () => {
      expect(MetroService.getAllStations('krasnodar')).toEqual([]);
      expect(MetroService.searchStations('Московская', 'krasnodar')).toEqual([]);
      expect(MetroService.getStationsByDistance(45.03, 38.97, 'krasnodar')).toEqual([]);
    });

    it('keeps station ids unique across every city', () => {
      const ids = METRO_CITY_CODES.flatMap(city =>
        MetroService.getAllStations(city).map(station => station.id)
      );
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('places every station inside the bounds of its own city', () => {
      const outside = METRO_CITY_CODES.flatMap(city =>
        MetroService.getAllStations(city)
          .filter(
            station =>
              !station.coordinates ||
              !isInsideBounds(
                station.coordinates.latitude,
                station.coordinates.longitude,
                CITY_BOUNDS[city]
              )
          )
          .map(station => `${city}:${station.name}`)
      );
      expect(outside).toEqual([]);
    });
  });

  describe('hasMetro', () => {
    it('is true exactly for the seven cities with station data', () => {
      expect([...METRO_CITY_CODES].sort()).toEqual([
        'kazan',
        'moscow',
        'nizhny_novgorod',
        'novosibirsk',
        'samara',
        'spb',
        'yekaterinburg',
      ]);
      expect(MetroService.hasMetro('samara')).toBe(true);
      expect(MetroService.hasMetro('krasnodar')).toBe(false);
    });
  });

  describe('searchStations', () => {
    it('scopes results to the requested city — Маяковская exists in both cities and must not cross-leak', () => {
      const moscowResults = MetroService.searchStations('Маяковская', 'moscow');
      const spbResults = MetroService.searchStations('Маяковская', 'spb');

      expect(moscowResults.map(s => s.line)).toEqual(['Замоскворецкая']);
      expect(spbResults.map(s => s.line)).toEqual(['Невско-Василеостровская']);
    });

    it('scopes Октябрьская to Novosibirsk without leaking the Moscow station', () => {
      const novosibirsk = MetroService.searchStations('Октябрьская', 'novosibirsk');

      expect(novosibirsk.map(s => `${s.id}|${s.line}`)).toEqual(['nsk-1-5|Ленинская']);
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

    it.each(NEW_METRO_CITIES)('lists the lines of $city in map order', ({ city, lines }) => {
      expect(MetroService.getUniqueLines(city).map(line => line.name)).toEqual(lines);
    });

    it('lists the 6 real Saint Petersburg lines (no ring line — that is Moscow only)', () => {
      const lines = MetroService.getUniqueLines('spb').map(line => line.name);

      expect(lines).toEqual([
        'Кировско-Выборгская',
        'Московско-Петроградская',
        'Невско-Василеостровская',
        'Лахтинско-Правобережная',
        'Фрунзенско-Приморская',
        'Красносельско-Калининская',
      ]);
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
