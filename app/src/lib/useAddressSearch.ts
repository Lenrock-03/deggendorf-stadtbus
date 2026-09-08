import { useEffect, useState } from "react";
import { searchAddress, type GeocodeResult } from "./geocode";

interface AddressSearchState {
  results: GeocodeResult[];
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 450;
const MIN_QUERY_LENGTH = 3;

/**
 * Adresssuche (Nominatim, siehe geocode.ts) mit Debounce + Abbruch veralteter Requests -
 * gleiche Interaktion wie die lokale Haltestellen-Autocomplete (stopAliases.ts), nur gegen
 * einen externen Dienst statt der lokalen Haltestellenliste. Von StopPicker (Routenplaner)
 * und StopSearch (Haltestellensuche, "Adresse statt Standort") gemeinsam genutzt.
 */
export function useAddressSearch(query: string, enabled: boolean): AddressSearchState {
  const [state, setState] = useState<AddressSearchState>({ results: [], loading: false, error: null });

  useEffect(() => {
    if (!enabled || query.trim().length < MIN_QUERY_LENGTH) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const results = await searchAddress(query, controller.signal);
        setState({ results, loading: false, error: null });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ results: [], loading: false, error: "Adresssuche gerade nicht verfügbar." });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return state;
}
