export interface PagesDomain {
  name: string;
  status?: string;
}
export interface AddressPick {
  url: string;
  /** The owner's own domain, when it isn't connected yet. */
  wanted?: string;
  wantedStatus?: string;
}
export function pickAddress(input: { base: string; subdomain: string; domains?: PagesDomain[] }): AddressPick;
export function readDomains(text: string): PagesDomain[];
