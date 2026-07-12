import { LeadProvider, LeadSearchParams, NormalizedLead } from "./lead-provider.interface.js";
import axios from "axios";

export class SerperLeadProvider implements LeadProvider {
  name = 'serper';

  async search(params: LeadSearchParams): Promise<any[]> {
    const query = this.buildQuery(params);
    
    try {
      const response = await axios.post('https://google.serper.dev/places', {
        q: query,
        gl: 'br',
        hl: 'pt-br',
        num: params.limit || 50
      }, {
        headers: {
          'X-API-KEY': params.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      });

      const data = response.data;

      if (data.error || data.message) {
        throw new Error(`Serper Error: ${data.error || data.message}`);
      }

      // Serper.dev returns results in the 'places' array
      return data.places || [];
    } catch (error: any) {
      if (error.response?.data) {
        const errorMsg = error.response.data.message || error.response.data.error || JSON.stringify(error.response.data);
        throw new Error(`Serper API Error: ${errorMsg}`);
      }
      throw error;
    }
  }

  normalize(raw: any): NormalizedLead {
    return {
      external_id: raw.cid || raw.placeId || raw.title,
      place_id: raw.placeId || raw.cid,
      business_name: raw.title,
      category: raw.category || (raw.categories && raw.categories[0]),
      phone: raw.phoneNumber || raw.phone,
      website: raw.website,
      address: raw.address,
      rating: raw.rating ? Number(raw.rating) : undefined,
      reviews_count: raw.ratingCount ? Number(raw.ratingCount) : undefined,
      latitude: raw.latitude,
      longitude: raw.longitude,
      google_maps_url: raw.cid ? `https://www.google.com/maps?cid=${raw.cid}` : undefined,
      raw_data: raw
    };
  }

  private buildQuery(params: LeadSearchParams): string {
    const parts = [];
    if (params.keyword) parts.push(params.keyword);
    if (params.neighborhood) parts.push(params.neighborhood);
    if (params.city) parts.push(params.city);
    if (params.state) parts.push(params.state);
    if (params.country) parts.push(params.country || 'Brasil');

    return parts.filter(Boolean).join(' ');
  }
}
