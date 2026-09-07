import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSundialPrints, saveSundialPrint } from '../utils/sundialPrintUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sundialPrintUtils World Tour fields', () => {
  it('sends the explicit opt-out value in the saved print payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    await saveSundialPrint({
      latitude: 40,
      longitude: -105,
      inclination: 40,
      declination: 0,
      gnomon_type: 'popup',
      notes_type: 'Notes',
      date_range: 'FullYear',
      exclude_from_world_tour: false,
    });

    const request = fetchMock.mock.calls[0];
    const body = JSON.parse(String((request[1] as RequestInit).body));
    expect(body.exclude_from_world_tour).toBe(false);
  });

  it('requests only eligible rows for World Tour candidates', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ prints: [], totalCount: 0 }), { status: 200 }),
    );

    await fetchSundialPrints(1000, true);

    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=1000');
    expect(String(fetchMock.mock.calls[0][0])).toContain('worldTour=1');
  });
});
