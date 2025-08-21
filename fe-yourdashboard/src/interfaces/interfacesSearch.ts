import { IEmail } from "./interfacesEmails";
import { CalendarEvent } from "./interfacesCalendar";

export interface IWhatsAppMessage {
  id: string;
  from: string;
  body: string;
  timestamp: number;
}

interface ISearchResults<T> {
  results: T[];
  total: number;
}

export interface IGlobalSearchData {
  emails: ISearchResults<IEmail> & { accountsSearched?: string[] };
  calendar: ISearchResults<CalendarEvent>;
  whatsapp: ISearchResults<IWhatsAppMessage>;
}

export interface IGlobalSearchSummary {
  totalResults: number;
  resultsPerSource: {
    emails: number;
    calendar: number;
    whatsapp: number;
  };
}

export interface IGlobalSearchResponse {
  success: boolean;
  source: string;
  searchTerm: string;
  data: IGlobalSearchData;
  summary: IGlobalSearchSummary;
}
